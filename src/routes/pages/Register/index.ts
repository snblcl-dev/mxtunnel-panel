import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/register',
  method: 'GET',
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const setting = await prisma.setting.findUnique({
      where: { key: 'registration_enabled' },
    });
    const disabled = setting?.value !== 'true';
    return Render.page(req, reply, '/register/index.html', { disabled });
  },
} as RouteOptions;