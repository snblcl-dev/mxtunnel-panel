import { validateCSRFToken } from '../utils/csrf-protection';
import { FastifyReply, FastifyRequest } from 'fastify';

export default async function RequireCSRF(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const body = (req.body as Record<string, any>) || {};
  const cookie = req.cookies?.csrfToken;
  const submitted = body._csrf;

  // Doble envío firmado: la cookie y el campo _csrf deben coincidir Y la
  // firma HMAC debe ser válida (protege contra fijación/forja de token).
  if (!cookie || typeof submitted !== 'string' || cookie !== submitted) {
    return reply.status(403).send({ error: 'CSRF', message: 'Token CSRF inválido.' });
  }

  if (!validateCSRFToken(submitted)) {
    return reply.status(403).send({ error: 'CSRF', message: 'Token CSRF inválido.' });
  }
}
