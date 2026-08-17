import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { cid: string };

export default {
  url: '/user/categories/:cid/edit',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { cid } = req.params as Params;
    const category = await prisma.category.findFirst({
      where: { id: Number(cid), user_id: userId },
    });
    if (!category) return reply.status(404).send({ error: 'NotFound' });
    return Render.page(req, reply, '/user/edit-category.html', { active: 'categories', category });
  },
} as RouteOptions;
