import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpThemeVersion } from '../../utils/bump-theme';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const MAX_THEMES = 10;

const schema = z.object({
  name: z.string().min(1).max(100),
  html: z.string().min(1),
});

export default {
  url: '/user/app/theme',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const body = req.body as Record<string, any>;
    const { action } = body;

    if (action === 'activate') {
      const id = Number(body.id);
      const theme = await prisma.theme.findFirst({ where: { id, owner_id: userId } });
      if (!theme) return ajaxFail(reply, 'Tema no encontrado', 404);
      await prisma.user.update({ where: { id: userId }, data: { active_theme_id: id } });
      await bumpThemeVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/app', 'Tema activado');
    }

    if (action === 'delete') {
      const id = Number(body.id);
      await prisma.theme.deleteMany({ where: { id, owner_id: userId } });
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.active_theme_id === id) {
        await prisma.user.update({ where: { id: userId }, data: { active_theme_id: null } });
      }
      await bumpThemeVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/app', 'Tema eliminado');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
    const d = parsed.data;

    const count = await prisma.theme.count({ where: { owner_id: userId } });
    if (count >= MAX_THEMES) return ajaxFail(reply, `Máximo ${MAX_THEMES} temas por usuario.`);

    await prisma.theme.create({ data: { name: d.name, html: d.html, owner_id: userId } });
    await bumpThemeVersion(userId);
    return ajaxOrRedirect(req, reply, '/user/app', 'Tema creado');
  },
} as RouteOptions;
