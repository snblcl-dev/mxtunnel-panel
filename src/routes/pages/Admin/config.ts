import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string };

export default {
  url: '/admin/users/:id/config',
  method: 'GET',
  onRequest: [AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as Params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'NotFound' });

    const categories = await prisma.category.findMany({
      where: { user_id: id },
      orderBy: { sorter: 'asc' },
    });

    const servers = await prisma.server.findMany({
      where: { user_id: id },
      orderBy: [{ category_id: 'asc' }, { sorter: 'asc' }],
    });

    return Render.page(req, reply, '/admin/config.html', { user, categories, servers });
  },
} as RouteOptions;
