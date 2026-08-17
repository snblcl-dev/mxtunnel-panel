import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { cid: string };
type Body = { action?: string; name?: string; color?: string; sorter?: string };

const schema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default('#3B82F6'),
  sorter: z.coerce.number().int().default(0),
});

export default {
  url: '/user/categories/:cid',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { cid } = req.params as Params;
    const body = req.body as Body;
    const { action } = body;

    const category = await prisma.category.findFirst({
      where: { id: Number(cid), user_id: userId },
    });
    if (!category) return ajaxFail(reply, 'No encontrada', 404);

    if (action === 'toggle') {
      await prisma.category.update({
        where: { id: category.id },
        data: { status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/categories', 'Estado actualizado');
    } else if (action === 'delete') {
      await prisma.category.delete({ where: { id: category.id } });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/categories', 'Categoría eliminada');
    } else if (action === 'update') {
      const parsed = schema.safeParse(body);
      if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
      const { name, color, sorter } = parsed.data;
      await prisma.category.update({
        where: { id: category.id },
        data: { name, color, sorter },
      });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/categories', 'Categoría actualizada');
    }
    return ajaxFail(reply, 'Acción inválida.');
  },
} as RouteOptions;
