import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/',
  method: 'GET',
  onRequest: [Authentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    if ((req as any).user.role !== 'ADMIN') return reply.redirect('/user');

    const [users, servers, categories] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.category.count(),
    ]);

    return Render.page(req, reply, '/home/index.html', {
      stats: { users, servers, categories },
    });
  },
} as RouteOptions;
