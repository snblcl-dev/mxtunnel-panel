import prisma from '../../config/prisma-client';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/settings',
  method: 'POST',
  onRequest: [Authentication, AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, any>;
    const action = body.action;

    if (action === 'registration') {
      // El checkbox solo se envía cuando está marcado.
      const enabled = body.registration_enabled === 'true' || body.registration_enabled === 'on';
      await prisma.setting.upsert({
        where: { key: 'registration_enabled' },
        update: { value: enabled ? 'true' : 'false' },
        create: { key: 'registration_enabled', value: enabled ? 'true' : 'false' },
      });
      return ajaxOrRedirect(req, reply, '/admin/settings', 'Ajustes guardados');
    }

    return ajaxFail(reply, 'Acción inválida.');
  },
} as RouteOptions;