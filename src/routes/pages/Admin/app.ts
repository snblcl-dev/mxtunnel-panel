import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/app',
  method: 'GET',
  onRequest: [Authentication, AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const globalTheme = await prisma.theme.findFirst({
      where: { owner_id: null },
      orderBy: { id: 'desc' },
    });
    return Render.page(req, reply, '/admin/app.html', {
      active: 'app',
      globalTheme,
    });
  },
} as RouteOptions;
