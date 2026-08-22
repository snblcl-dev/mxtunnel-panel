import prisma from '../../config/prisma-client';
import SafeCallback from '../../utils/safe-callback';
import { isExpired } from '../../utils/format-date';
import { getApiToken } from '../../utils/api-token';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/api/version',
  method: 'GET',
  config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const token = getApiToken(req);

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Falta el token.' });
    }

    const user = await SafeCallback(() =>
      prisma.user.findUnique({ where: { id: token } })
    );

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido.' });
    }

    if (user.banned || isExpired(user.expiration_date)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Sin acceso.' });
    }

    return reply.send({ version: user.config_version });
  },
} as RouteOptions;
