import { FastifyReply } from 'fastify';

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
) {
  // secure solo si la petición llegó por HTTPS (detectado vía trustProxy).
  // Así el acceso por HTTP (LAN/IP, pruebas) sigue funcionando.
  const secure = reply.request.protocol === 'https';
  reply.setCookie('accessToken', accessToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 60 * 60 * 24 * 7,
  });
  reply.setCookie('refreshToken', refreshToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('accessToken', { path: '/' });
  reply.clearCookie('refreshToken', { path: '/' });
}
