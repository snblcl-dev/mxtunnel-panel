import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { cid: string };
type Body = { action?: string; name?: string; color?: string; sorter?: string };

const schema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default('#3B82F6'),
  sorter: z.coerce.number().int().default(0),
});

export default {
  url: '/user/categories/:cid',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { cid } = req.params as Params;
    const body = req.body as Body;
    const { action } = body;

    const category = await prisma.category.findFirst({
      where: { id: Number(cid), user_id: userId },
    });
    if (!category) return reply.status(404).send({ error: 'NotFound' });

    if (action === 'toggle') {
      await prisma.category.update({
        where: { id: category.id },
        data: { status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      });
    } else if (action === 'delete') {
      await prisma.category.delete({ where: { id: category.id } });
    } else if (action === 'update') {
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'ValidationError', details: parsed.error.issues });
      }
      const { name, color, sorter } = parsed.data;
      await prisma.category.update({
        where: { id: category.id },
        data: { name, color, sorter },
      });
    } else {
      return reply.status(400).send({ error: 'ValidationError', message: 'Acción inválida.' });
    }

    await bumpConfigVersion(userId);
    return reply.redirect('/user/categories');
  },
} as RouteOptions;
