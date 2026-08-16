import JWTConfig from '../config/jwt-config';
import { FastifyReply, FastifyRequest } from 'fastify';

export default async function Authentication(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const token = req.cookies.accessToken;

  if (!token) {
    return reply.status(401).redirect('/login');
  }

  try {
    const payload = JWTConfig.verify(token);
    (req as any).user = payload;
  } catch {
    return reply.status(401).redirect('/login');
  }
}
