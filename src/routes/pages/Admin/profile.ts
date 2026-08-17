import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/profile',
  method: 'GET',
  onRequest: [Authentication, AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const adminId = (req as any).user.id;
    const me = await prisma.user.findUnique({ where: { id: adminId } });
    if (!me) return reply.redirect('/login');
    return Render.page(req, reply, '/admin/profile.html', { active: 'profile', me });
  },
} as RouteOptions;
