import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { comparePassword, hashPassword } from '../../utils/bcrypt';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const emailSchema = z.object({ email: z.string().email() });
const passSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6),
});

export default {
  url: '/admin/profile',
  method: 'POST',
  onRequest: [Authentication, AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const adminId = (req as any).user.id;
    const body = req.body as Record<string, any>;
    const action = body.action;

    if (action === 'update_email') {
      const parsed = emailSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'ValidationError', details: parsed.error.issues });
      }
      try {
        await prisma.user.update({
          where: { id: adminId },
          data: { email: parsed.data.email },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          return reply.status(409).send({ error: 'Conflict', message: 'Ese email ya está en uso.' });
        }
        throw e;
      }
    } else if (action === 'update_password') {
      const parsed = passSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'ValidationError', details: parsed.error.issues });
      }
      if (parsed.data.new_password !== parsed.data.confirm_password) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Las contraseñas no coinciden.' });
      }
      const user = await prisma.user.findUnique({ where: { id: adminId } });
      if (!user || !user.password) {
        return reply.status(400).send({ error: 'ValidationError', message: 'No tienes contraseña configurada.' });
      }
      const ok = await comparePassword(parsed.data.current_password, user.password);
      if (!ok) {
        return reply.status(400).send({ error: 'ValidationError', message: 'Contraseña actual incorrecta.' });
      }
      const hashed = await hashPassword(parsed.data.new_password);
      await prisma.user.update({ where: { id: adminId }, data: { password: hashed } });
    } else {
      return reply.status(400).send({ error: 'ValidationError', message: 'Acción inválida.' });
    }

    return reply.redirect('/admin/profile');
  },
} as RouteOptions;
