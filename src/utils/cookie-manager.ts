import { FastifyReply } from 'fastify';

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
) {
  const secure = process.env.NODE_ENV === 'production';
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
