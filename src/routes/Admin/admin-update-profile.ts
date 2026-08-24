import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { comparePassword, hashPassword } from '../../utils/bcrypt';
import { clearAuthCookies } from '../../utils/cookie-manager';
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
      if (!parsed.success) return ajaxFail(reply, 'Email inválido.');
      try {
        await prisma.user.update({ where: { id: adminId }, data: { email: parsed.data.email } });
      } catch (e: any) {
        if (e.code === 'P2002') return ajaxFail(reply, 'Ese email ya está en uso.', 409);
        throw e;
      }
      return ajaxOrRedirect(req, reply, '/admin/profile', 'Email actualizado');
    } else if (action === 'update_password') {
      const parsed = passSchema.safeParse(body);
      if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
      if (parsed.data.new_password !== parsed.data.confirm_password) return ajaxFail(reply, 'Las contraseñas no coinciden.');
      const user = await prisma.user.findUnique({ where: { id: adminId } });
      if (!user || !user.password) return ajaxFail(reply, 'No tienes contraseña configurada.');
      const ok = await comparePassword(parsed.data.current_password, user.password);
      if (!ok) return ajaxFail(reply, 'Contraseña actual incorrecta.');
      const hashed = await hashPassword(parsed.data.new_password);
      // Invalida todas las sesiones existentes al cambiar la contraseña.
      await prisma.user.update({
        where: { id: adminId },
        data: { password: hashed, token_version: { increment: 1 } },
      });
      clearAuthCookies(reply);
      return ajaxOrRedirect(req, reply, '/admin/profile', 'Contraseña actualizada');
    }
    return ajaxFail(reply, 'Acción inválida.');
  },
} as RouteOptions;
