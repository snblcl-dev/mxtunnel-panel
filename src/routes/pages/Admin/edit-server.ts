import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string; sid: string };

export default {
  url: '/admin/users/:id/servers/:sid/edit',
  method: 'GET',
  onRequest: [AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, sid } = req.params as Params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'NotFound' });

    const server = await prisma.server.findFirst({
      where: { id: Number(sid), user_id: id },
    });
    if (!server) return reply.status(404).send({ error: 'NotFound' });

    const categories = await prisma.category.findMany({
      where: { user_id: id },
      orderBy: { sorter: 'asc' },
    });

    return Render.page(req, reply, '/admin/edit-server.html', { active: 'users', user, server, categories });
  },
} as RouteOptions;
