import prisma from '../../config/prisma-client';
import JWTConfig from '../../config/jwt-config';
import bcrypt from 'bcrypt';
import { comparePassword } from '../../utils/bcrypt';
import { setAuthCookies } from '../../utils/cookie-manager';
import RequireCSRF from '../../middlewares/require-csrf';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Body = { email?: string; password?: string };

// Hash de relleno: se compara siempre (aunque el usuario no exista) para
// evitar la enumeración de cuentas por diferencia de tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync('mxtunnel-timing-dummy-password', 10);

export default {
  url: '/login',
  method: 'POST',
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = req.body as Body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'ValidationError', message: 'Email y contraseña requeridos.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    const passwordOk = await comparePassword(password, user?.password ?? DUMMY_HASH);
    if (!user || !user.password || !passwordOk) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Credenciales inválidas.' });
    }

    if (user.banned) {
      return reply.status(403).send({ error: 'Banned', message: 'Cuenta suspendida.' });
    }

    const accessToken = JWTConfig.sign(user.id, user.email, user.role, user.token_version);
    const refreshToken = JWTConfig.refresh(user.id, user.email, user.role, user.token_version);

    setAuthCookies(reply, accessToken, refreshToken);

    return reply.redirect('/');
  },
} as RouteOptions;
