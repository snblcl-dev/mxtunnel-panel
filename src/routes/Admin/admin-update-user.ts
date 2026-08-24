import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string };
type Body = { action?: string; expiration_date?: string };

export default {
  url: '/admin/users/:id',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as Params;
    const { action, expiration_date } = req.body as Body;
    const adminId = (req as any).user.id;

    if (id === adminId) {
      return ajaxFail(reply, 'No puedes modificar tu propia cuenta aquí. Usa tu perfil.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return ajaxFail(reply, 'No encontrado', 404);

    switch (action) {
      case 'ban':
        // Transacción para evitar condición de carrera (leer estado y actualizar atómicamente).
        await prisma.$transaction(async (tx) => {
          const current = await tx.user.findUnique({ where: { id } });
          await tx.user.update({
            where: { id },
            data: { banned: current ? !current.banned : user.banned },
          });
        });
        return ajaxOrRedirect(req, reply, '/admin/users', user.banned ? 'Usuario desbaneado' : 'Usuario baneado');
      case 'expire': {
        const expiration = expiration_date ? new Date(expiration_date) : null;
        if (expiration_date && Number.isNaN(expiration!.getTime())) {
          return ajaxFail(reply, 'Fecha de expiración inválida.');
        }
        await prisma.user.update({
          where: { id },
          data: { expiration_date: expiration },
        });
        return ajaxOrRedirect(req, reply, '/admin/users', 'Expiración actualizada');
      }
      case 'lock':
        await prisma.$transaction(async (tx) => {
          const current = await tx.user.findUnique({ where: { id } });
          await tx.user.update({
            where: { id },
            data: { configs_locked: current ? !current.configs_locked : user.configs_locked },
          });
        });
        return ajaxOrRedirect(req, reply, '/admin/users', 'Bloqueo actualizado');
      case 'delete':
        await prisma.user.delete({ where: { id } });
        return ajaxOrRedirect(req, reply, '/admin/users', 'Usuario eliminado');
      default:
        return ajaxFail(reply, 'Acción inválida.');
    }
  },
} as RouteOptions;
