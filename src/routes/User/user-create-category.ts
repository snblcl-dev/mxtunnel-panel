import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default('#3B82F6'),
  sorter: z.coerce.number().int().default(0),
});

export default {
  url: '/user/categories',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
    const { name, color, sorter } = parsed.data;
    await prisma.category.create({
      data: { name, color, sorter, status: 'ACTIVE', user_id: userId },
    });
    await bumpConfigVersion(userId);
    return ajaxOrRedirect(req, reply, '/user/categories', 'Categoría creada');
  },
} as RouteOptions;
