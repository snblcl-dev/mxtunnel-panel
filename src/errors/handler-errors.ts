import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export default function HandlerErrors(
  error: Error,
  req: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: 'ValidationError', details: error.issues });
  }

  if ((error as any).code === 'P2002') {
    return reply.status(409).send({ error: 'Conflict', message: 'El registro ya existe.' });
  }

  console.error('[Error]', error.message);
  return reply.status(500).send({ error: 'InternalServerError', message: error.message });
}
