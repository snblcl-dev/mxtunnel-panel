import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/servers',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const [categories, servers] = await Promise.all([
      prisma.category.findMany({ where: { user_id: userId }, orderBy: { sorter: 'asc' } }),
      prisma.server.findMany({
        where: { user_id: userId },
        orderBy: [{ category_id: 'asc' }, { sorter: 'asc' }],
      }),
    ]);
    return Render.page(req, reply, '/user/servers.html', { active: 'servers', categories, servers });
  },
} as RouteOptions;
