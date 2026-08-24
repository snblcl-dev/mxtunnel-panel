import { createCSRFToken } from '../utils/csrf-protection';
import { Render } from '../config/render-config';
import GetFilesDir from '../utils/get-files-dir';
import HandlerErrors from '../errors/handler-errors';
import { FastifyInstance, RouteOptions } from 'fastify';

export default function handler(fastify: FastifyInstance, _: any, done: () => void) {
  fastify.addHook('onRequest', async (req, reply) => {
    if (req.raw.url?.startsWith('/api')) return;
    if (!req.cookies.csrfToken) {
      const token = createCSRFToken();
      reply.setCookie('csrfToken', token, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      (req as any).csrfToken = token;
    } else {
      (req as any).csrfToken = req.cookies.csrfToken;
    }
  });

  const routes = GetFilesDir(__dirname, ['handle-routes.ts', 'handle-routes.js']);

  routes.forEach((file) => {
    try {
      const route: RouteOptions = require(file).default;
      if (route && route.url) fastify.route(route);
    } catch (err) {
      console.log(`[Routes] Error cargando ${file}`, err);
    }
  });

  fastify.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api')) {
      return reply.status(404).send({ error: 'NotFound' });
    }
    reply.status(404);
    Render.page(req, reply, '/404/index.html');
  });

  fastify.setErrorHandler(HandlerErrors);

  done();
}
