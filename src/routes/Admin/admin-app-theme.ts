import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpAllThemesVersion } from '../../utils/bump-theme';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  name: z.string().min(1).max(100),
  html: z.string().min(1),
});

export default {
  url: '/admin/app/theme',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, any>;
    const { action } = body;

    if (action === 'delete') {
      await prisma.theme.deleteMany({ where: { owner_id: null } });
      await bumpAllThemesVersion();
      return ajaxOrRedirect(req, reply, '/admin/app', 'Tema global eliminado');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
    const d = parsed.data;

    const existing = await prisma.theme.findFirst({ where: { owner_id: null } });
    if (existing) {
      await prisma.theme.update({ where: { id: existing.id }, data: { name: d.name, html: d.html } });
    } else {
      await prisma.theme.create({ data: { name: d.name, html: d.html, owner_id: null } });
    }
    await bumpAllThemesVersion();
    return ajaxOrRedirect(req, reply, '/admin/app', 'Tema global actualizado');
  },
} as RouteOptions;
