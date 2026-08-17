import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/categories',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const categories = await prisma.category.findMany({
      where: { user_id: userId },
      orderBy: { sorter: 'asc' },
    });
    return Render.page(req, reply, '/user/categories.html', { active: 'categories', categories });
  },
} as RouteOptions;
