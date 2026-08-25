import { z } from 'zod';
import prisma from '../../config/prisma-client';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  name: z.string().min(1).max(100),
  html: z.string().min(1),
});

export default {
  url: '/admin/app/theme',
  method: 'POST',
  onRequest: [Authentication, AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, any>;

    // Eliminar un tema global de la comunidad (solo owner_id null).
    if (body.action === 'delete') {
      const id = Number(body.id);
      if (!id) return ajaxFail(reply, 'Datos inválidos.');
      await prisma.theme.deleteMany({ where: { id, owner_id: null } });
      return ajaxOrRedirect(req, reply, '/admin/app', 'Tema de comunidad eliminado');
    }

    // Crear un tema global (owner_id null = disponible para todos).
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
    const { name, html } = parsed.data;
    await prisma.theme.create({ data: { name, html, owner_id: null } });
    return ajaxOrRedirect(req, reply, '/admin/app', 'Tema de comunidad publicado');
  },
} as RouteOptions;