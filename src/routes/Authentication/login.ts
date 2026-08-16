import prisma from '../../config/prisma-client';
import JWTConfig from '../../config/jwt-config';
import { comparePassword } from '../../utils/bcrypt';
import { setAuthCookies } from '../../utils/cookie-manager';
import RequireCSRF from '../../middlewares/require-csrf';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Body = { email?: string; password?: string };

export default {
  url: '/login',
  method: 'POST',
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = req.body as Body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Email y contraseña requeridos.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password || !(await comparePassword(password, user.password))) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
    }

    if (user.banned) {
      return reply.status(403).send({ error: 'Banned', message: 'Cuenta suspendida.' });
    }

    const accessToken = JWTConfig.sign(user.id, user.email, user.role);
    const refreshToken = JWTConfig.refresh(user.id, user.email, user.role);

    setAuthCookies(reply, accessToken, refreshToken);

    return reply.redirect('/');
  },
} as RouteOptions;
