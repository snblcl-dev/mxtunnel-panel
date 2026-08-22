import { FastifyRequest } from 'fastify';

/**
 * Extrae el token de la cabecera `Authorization: Bearer <token>`.
 * Devuelve null si no viene (o si el formato no es Bearer).
 */
export function getApiToken(req: FastifyRequest): string | null {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}
