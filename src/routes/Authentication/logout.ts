import JWTConfig from '../../config/jwt-config';
import prisma from '../../config/prisma-client';
import { clearAuthCookies } from '../../utils/cookie-manager';
import RequireCSRF from '../../middlewares/require-csrf';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/logout',
  method: 'POST',
  config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies.accessToken;
    if (token) {
      try {
        const payload = JWTConfig.verify(token);
        // Revoca todas las sesiones del usuario (incrementa token_version).
        await prisma.user.update({
          where: { id: payload.id },
          data: { token_version: { increment: 1 } },
        });
      } catch {
        // token inválido/expirado: limpiar de todas formas
      }
    }
    clearAuthCookies(reply);
    return reply.redirect('/login');
  },
} as RouteOptions;
