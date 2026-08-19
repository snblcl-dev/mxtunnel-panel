import { Render } from '../../../config/render-config';
import prisma from '../../../config/prisma-client';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/app',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const [user, themes] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.theme.findMany({ where: { owner_id: userId }, orderBy: { id: 'desc' } }),
    ]);
    return Render.page(req, reply, '/user/app.html', {
      active: 'app',
      themes,
      activeThemeId: user?.active_theme_id ?? null,
      MAX_THEMES: 10,
    });
  },
} as RouteOptions;
