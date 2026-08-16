import { clearAuthCookies } from '../../utils/cookie-manager';
import RequireCSRF from '../../middlewares/require-csrf';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/logout',
  method: 'POST',
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    clearAuthCookies(reply);
    return reply.redirect('/login');
  },
} as RouteOptions;
