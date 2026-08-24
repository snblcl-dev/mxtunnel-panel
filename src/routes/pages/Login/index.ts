import { Render } from '../../../config/render-config';
import JWTConfig from '../../../config/jwt-config';
import prisma from '../../../config/prisma-client';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/login',
  method: 'GET',
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies.accessToken;
    if (token) {
      try {
        const payload = JWTConfig.verify(token);
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        // Solo redirige si la sesión sigue válida (no revocada).
        if (user && user.token_version === payload.token_version) {
          return reply.redirect('/');
        }
      } catch {
        // token inválido o expirado: mostrar el login
      }
    }
    return Render.page(req, reply, '/login/index.html');
  },
} as RouteOptions;
