import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/settings',
  method: 'GET',
  onRequest: [Authentication, AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const [enabledSetting, daysSetting] = await Promise.all([
      prisma.setting.findUnique({
        where: { key: 'registration_enabled' },
      }),
      prisma.setting.findUnique({
        where: { key: 'registration_expiration_days' },
      }),
    ]);
    return Render.page(req, reply, '/admin/settings.html', {
      active: 'settings',
      registrationEnabled: enabledSetting?.value === 'true',
      registrationDays: daysSetting?.value ?? '0',
    });
  },
} as RouteOptions;