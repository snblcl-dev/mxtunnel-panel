import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { isExpired } from '../../../utils/format-date';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const [user, categories, servers] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.category.count({ where: { user_id: userId } }),
      prisma.server.count({ where: { user_id: userId } }),
    ]);
    if (!user) return reply.redirect('/login');

    return Render.page(req, reply, '/user/dashboard.html', {
      active: 'home',
      me: user,
      expired: isExpired(user.expiration_date),
      counts: { categories, servers },
    });
  },
} as RouteOptions;
