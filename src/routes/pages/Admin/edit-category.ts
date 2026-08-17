import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string; cid: string };

export default {
  url: '/admin/users/:id/categories/:cid/edit',
  method: 'GET',
  onRequest: [AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, cid } = req.params as Params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.status(404).send({ error: 'NotFound' });

    const category = await prisma.category.findFirst({
      where: { id: Number(cid), user_id: id },
    });
    if (!category) return reply.status(404).send({ error: 'NotFound' });

    return Render.page(req, reply, '/admin/edit-category.html', { active: 'users', user, category });
  },
} as RouteOptions;
