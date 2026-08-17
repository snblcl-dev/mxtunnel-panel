import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/users',
  method: 'GET',
  onRequest: [AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { servers: true, categories: true } } },
    });
    return Render.page(req, reply, '/admin/users.html', { active: 'users', users });
  },
} as RouteOptions;
