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

  const statusCode = (error as any).statusCode;
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    return reply.status(statusCode).send({ error: 'Error', message: error.message });
  }

  console.error('[Error]', error);
  if (process.env.NODE_ENV === 'production') {
    // No exponer detalles internos en producción.
    return reply.status(500).send({ error: 'InternalServerError' });
  }
  return reply.status(500).send({ error: 'InternalServerError', message: error.message });
}
