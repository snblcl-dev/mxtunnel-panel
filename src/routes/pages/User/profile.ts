import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/profile',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me) return reply.redirect('/login');
    return Render.page(req, reply, '/user/profile.html', { active: 'profile', me });
  },
} as RouteOptions;
