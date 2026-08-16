import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string; cid: string };
type Body = { action?: string };

export default {
  url: '/admin/users/:id/categories/:cid',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, cid } = req.params as Params;
    const { action } = req.body as Body;

    const category = await prisma.category.findFirst({
      where: { id: Number(cid), user_id: id },
    });
    if (!category) return reply.status(404).send({ error: 'NotFound' });

    if (action === 'toggle') {
      await prisma.category.update({
        where: { id: category.id },
        data: { status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      });
    } else if (action === 'delete') {
      await prisma.category.delete({ where: { id: category.id } });
    }

    await bumpConfigVersion(id);
    return reply.redirect(`/admin/users/${id}/config`);
  },
} as RouteOptions;
