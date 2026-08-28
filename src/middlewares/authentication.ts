import JWTConfig from '../config/jwt-config';
import prisma from '../config/prisma-client';
import { clearAuthCookies } from '../utils/cookie-manager';
import { FastifyReply, FastifyRequest } from 'fastify';

export default async function Authentication(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const token = req.cookies.accessToken;

  if (!token) {
    return reply.redirect('/login');
  }

  try {
    const payload = JWTConfig.verify(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    // Verifica que la sesión no fue revocada (logout o cambio de contraseña).
    if (!user || user.token_version !== payload.token_version) {
      clearAuthCookies(reply);
      return reply.redirect('/login');
    }
    (req as any).user = payload;
  } catch {
    return reply.redirect('/login');
  }
}
