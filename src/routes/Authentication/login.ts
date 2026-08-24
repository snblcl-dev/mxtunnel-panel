import prisma from '../../config/prisma-client';
import JWTConfig from '../../config/jwt-config';
import bcrypt from 'bcrypt';
import { Render } from '../../config/render-config';
import { comparePassword } from '../../utils/bcrypt';
import { setAuthCookies } from '../../utils/cookie-manager';
import RequireCSRF from '../../middlewares/require-csrf';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Body = { email?: string; password?: string };

// Hash de relleno: se compara siempre (aunque el usuario no exista) para
// evitar la enumeración de cuentas por diferencia de tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync('mxtunnel-timing-dummy-password', 10);

// Re-renderiza el login con un aviso de error en la propia página.
function renderLoginError(req: FastifyRequest, reply: FastifyReply, message: string) {
  return Render.page(req, reply, '/login/index.html', { error: message });
}

export default {
  url: '/login',
  method: 'POST',
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = req.body as Body;

    if (!email || !password) {
      return renderLoginError(req, reply, 'Ingresa tu email y contraseña.');
    }

    const user = await prisma.user.findUnique({ where: { email } });

    const passwordOk = await comparePassword(password, user?.password ?? DUMMY_HASH);
    if (!user || !user.password || !passwordOk) {
      return renderLoginError(req, reply, 'Usuario o contraseña incorrectos.');
    }

    if (user.banned) {
      return renderLoginError(req, reply, 'Tu cuenta está suspendida.');
    }

    const accessToken = JWTConfig.sign(user.id, user.email, user.role, user.token_version);
    const refreshToken = JWTConfig.refresh(user.id, user.email, user.role, user.token_version);

    setAuthCookies(reply, accessToken, refreshToken);

    return reply.redirect('/');
  },
} as RouteOptions;
