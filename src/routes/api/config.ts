import prisma from '../../config/prisma-client';
import SafeCallback from '../../utils/safe-callback';
import { isExpired } from '../../utils/format-date';
import { serializeServer, serializeCategory } from '../../utils/serialize';
import { getApiToken } from '../../utils/api-token';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/api/config',
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

    if (user.banned) {
      return reply.status(403).send({ error: 'Banned', message: 'Cuenta suspendida.' });
    }

    if (isExpired(user.expiration_date)) {
      return reply.status(403).send({ error: 'Expired', message: 'Cuenta expirada.' });
    }

    const [categories, servers] = await Promise.all([
      SafeCallback(() =>
        prisma.category.findMany({
          where: { user_id: user.id, status: 'ACTIVE' },
          orderBy: { sorter: 'asc' },
        })
      ),
      SafeCallback(() =>
        prisma.server.findMany({
          where: {
            user_id: user.id,
            status: 'ACTIVE',
            category: { status: 'ACTIVE' },
          },
          orderBy: [{ sorter: 'asc' }, { id: 'asc' }],
        })
      ),
    ]);

    let settings = null;
    if (user.app_settings) {
      try {
        settings = JSON.parse(user.app_settings);
      } catch {
        settings = null;
      }
    }

    return reply.send({
      version: user.config_version,
      themeVersion: user.theme_version,
      settings,
      categories: (categories ?? []).map(serializeCategory),
      servers: (servers ?? []).map(serializeServer),
    });
  },
} as RouteOptions;
