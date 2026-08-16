import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string };
type Body = { action?: string; expiration_date?: string };

export default {
  url: '/admin/users/:id',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as Params;
    const { action, expiration_date } = req.body as Body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'NotFound' });

    switch (action) {
      case 'ban': {
        await prisma.user.update({ where: { id }, data: { banned: !user.banned } });
        break;
      }
      case 'expire': {
        await prisma.user.update({
          where: { id },
          data: { expiration_date: expiration_date ? new Date(expiration_date) : null },
        });
        break;
      }
      case 'lock': {
        await prisma.user.update({ where: { id }, data: { configs_locked: !user.configs_locked } });
        break;
      }
      case 'delete': {
        await prisma.user.delete({ where: { id } });
        break;
      }
      default:
        return reply.status(400).send({ error: 'ValidationError', message: 'Acción inválida.' });
    }

    return reply.redirect('/admin/users');
  },
} as RouteOptions;
