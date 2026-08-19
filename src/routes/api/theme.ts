import prisma from '../../config/prisma-client';
import SafeCallback from '../../utils/safe-callback';
import { isExpired } from '../../utils/format-date';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Query = { token?: string };

export default {
  url: '/api/theme',
  method: 'GET',
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { token } = req.query as Query;

    if (!token || typeof token !== 'string') {
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

    // Tema del usuario: si no tiene uno activo, la app usa su tema embebido (default)
    let theme = null;
    const activeId = user.active_theme_id;
    if (activeId) {
      theme = await SafeCallback(() =>
        prisma.theme.findFirst({ where: { id: activeId, owner_id: user.id } })
      );
    }

    return reply.send({
      version: user.theme_version,
      name: theme ? theme.name : null,
      html: theme ? theme.html : null,
    });
  },
} as RouteOptions;
