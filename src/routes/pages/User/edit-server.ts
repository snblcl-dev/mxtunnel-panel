import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { sid: string };

export default {
  url: '/user/servers/:sid/edit',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { sid } = req.params as Params;
    const [server, categories] = await Promise.all([
      prisma.server.findFirst({ where: { id: Number(sid), user_id: userId } }),
      prisma.category.findMany({ where: { user_id: userId }, orderBy: { sorter: 'asc' } }),
    ]);
    if (!server) return reply.status(404).send({ error: 'NotFound' });
    return Render.page(req, reply, '/user/edit-server.html', { active: 'servers', server, categories });
  },
} as RouteOptions;
