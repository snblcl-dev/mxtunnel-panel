import prisma from '../../config/prisma-client';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const MAX_THEMES = 10;

export default {
  url: '/user/community/download',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const id = Number((req.body as Record<string, any>).id);
    if (!id) return ajaxFail(reply, 'Datos inválidos.');

    // Solo se puede descargar un tema global publicado por el admin.
    const global = await prisma.theme.findFirst({ where: { id, owner_id: null } });
    if (!global) return ajaxFail(reply, 'Tema no encontrado', 404);

    const ownCount = await prisma.theme.count({ where: { owner_id: userId } });
    if (ownCount >= MAX_THEMES) {
      return ajaxFail(reply, `Has alcanzado el máximo de ${MAX_THEMES} temas. Elimina uno para descargar otro.`);
    }

    // Descargar = copiar el tema global como tema propio (para poder activarlo
    // luego desde Aplicación; /api/theme solo sirve temas del propio usuario).
    await prisma.theme.create({
      data: { name: global.name, html: global.html, owner_id: userId },
    });

    return ajaxOrRedirect(req, reply, '/user/app?tab=themes', 'Tema guardado en tus temas');
  },
} as RouteOptions;