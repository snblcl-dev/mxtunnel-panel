import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string };

const schema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default('#3B82F6'),
  sorter: z.coerce.number().int().default(0),
});

export default {
  url: '/admin/users/:id/categories',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as Params;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
    const { name, color, sorter } = parsed.data;
    await prisma.category.create({ data: { name, color, sorter, status: 'ACTIVE', user_id: id } });
    await bumpConfigVersion(id);
    return ajaxOrRedirect(req, reply, `/admin/users/${id}/config`, 'Categoría creada');
  },
} as RouteOptions;
