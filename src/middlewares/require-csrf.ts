import { FastifyReply, FastifyRequest } from 'fastify';

export default async function RequireCSRF(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const body = (req.body as Record<string, any>) || {};
  const token = (req as any).csrfToken;

  if (!token || !body._csrf || body._csrf !== token) {
    return reply.status(403).send({ error: 'CSRF', message: 'Token CSRF inválido.' });
  }
}
