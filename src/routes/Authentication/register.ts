import { z } from 'zod';
import prisma from '../../config/prisma-client';
import JWTConfig from '../../config/jwt-config';
import { Render } from '../../config/render-config';
import { hashPassword } from '../../utils/bcrypt';
import { setAuthCookies } from '../../utils/cookie-manager';
import RequireCSRF from '../../middlewares/require-csrf';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

// Renderiza el registro reutilizando el estado que se le pasó al GET.
function renderRegister(req: FastifyRequest, reply: FastifyReply, extra: Record<string, any> = {}) {
  return Render.page(req, reply, '/register/index.html', extra);
}

export default {
  url: '/register',
  method: 'POST',
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    // El registro lo habilita el admin desde /admin/settings. Si está
    // deshabilitado, se muestra el aviso y no se crea ningún usuario.
    const setting = await prisma.setting.findUnique({
      where: { key: 'registration_enabled' },
    });
    if (setting?.value !== 'true') {
      return renderRegister(req, reply, { disabled: true });
    }

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return renderRegister(req, reply, { error: 'Revisa los datos: usuario (mín. 3), email válido y contraseña (mín. 6).' });
    }

    const { username, email, password } = parsed.data;
    const hashed = await hashPassword(password);

    let user;
    try {
      user = await prisma.user.create({
        data: { username, email, password: hashed, role: 'USER' },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return renderRegister(req, reply, { error: 'Ese nombre de usuario o correo ya está registrado.' });
      }
      throw e;
    }

    // Login automático: al registrarse se inicia sesión en el panel.
    const accessToken = JWTConfig.sign(user.id, user.email, user.role, user.token_version);
    const refreshToken = JWTConfig.refresh(user.id, user.email, user.role, user.token_version);
    setAuthCookies(reply, accessToken, refreshToken);

    return reply.redirect('/');
  },
} as RouteOptions;