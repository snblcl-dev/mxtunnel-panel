import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/community',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const themes = await prisma.theme.findMany({
      where: { owner_id: null },
      orderBy: { id: 'desc' },
    });
    const ownCount = await prisma.theme.count({ where: { owner_id: userId } });

    return Render.page(req, reply, '/user/community.html', {
      active: 'community',
      themes,
      themesJson: JSON.stringify(themes).replace(/<\//g, '<\\/'),
      MAX_THEMES: 10,
      ownCount,
      downloadBlocked: ownCount >= 10,
    });
  },
} as RouteOptions;