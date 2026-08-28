import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { cleanOldApks } from '../../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/apk',
  method: 'GET',
  onRequest: [AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: { created_at: 'desc' },
      select: { id: true, username: true, email: true, apk_package: true, apk_name: true, apk_generated: true },
    });
    cleanOldApks();
    return Render.page(req, reply, '/admin/apk.html', {
      active: 'apk',
      users,
      apks: [],
    });
  },
} as RouteOptions;
