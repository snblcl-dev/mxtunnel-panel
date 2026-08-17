import prisma from '../config/prisma-client';
import { isExpired } from '../utils/format-date';
import { FastifyReply, FastifyRequest } from 'fastify';

export default async function UserActive(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user?.id;
  if (!userId) {
    reply.clearCookie('accessToken', { path: '/' });
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.redirect('/login');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    reply.clearCookie('accessToken', { path: '/' });
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.redirect('/login');
  }
  if (user.banned) {
    return reply.status(403).send({ error: 'Banned', message: 'Cuenta suspendida.' });
  }
  if (isExpired(user.expiration_date)) {
    return reply.status(403).send({ error: 'Expired', message: 'Cuenta expirada.' });
  }
}
