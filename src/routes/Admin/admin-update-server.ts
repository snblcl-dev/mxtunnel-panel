import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { id: string; sid: string };
type Body = { action?: string };

export default {
  url: '/admin/users/:id/servers/:sid',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, sid } = req.params as Params;
    const { action } = req.body as Body;

    const server = await prisma.server.findFirst({
      where: { id: Number(sid), user_id: id },
    });
    if (!server) return reply.status(404).send({ error: 'NotFound' });

    if (action === 'toggle') {
      await prisma.server.update({
        where: { id: server.id },
        data: { status: server.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      });
    } else if (action === 'delete') {
      await prisma.server.delete({ where: { id: server.id } });
    }

    await bumpConfigVersion(id);
    return reply.redirect(`/admin/users/${id}/config`);
  },
} as RouteOptions;
