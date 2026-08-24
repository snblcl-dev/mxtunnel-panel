import { Eta } from 'eta';
import * as path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fastifyCookie, { type FastifyCookieOptions } from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';

const dashboard = path.resolve(process.cwd(), 'frontend', 'public');
const views = path.resolve(process.cwd(), 'frontend', 'views');

// CORS seguro por defecto: solo se habilitan orígenes explícitos vía
// CORS_ALLOWED_ORIGINS (separados por coma). Con la lista vacía se desactiva
// CORS por completo (la APK usa HttpURLConnection, no lo necesita).
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// trustProxy: solo confía en X-Forwarded-* cuando la conexión directa viene de
// nginx en localhost. Así se detecta el protocolo real (https detrás de nginx)
// sin permitir que clientes externos falseen cabeceras.
const fastify = Fastify({
  ignoreTrailingSlash: true,
  trustProxy: (address: string) =>
    address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1',
});
export const eta = new Eta({ views, cache: false });

import routes from './routes/handle-routes';

fastify
  .register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  })
  .register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: ['data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // Los iframes srcdoc de la vista previa de temas (admin) usan contenido local.
        frameSrc: ["'self'", 'about:', 'data:'],
        frameAncestors: ["'none'"],
        // El panel usa onclick/onsubmit inline en sus plantillas: se permite
        // que caigan bajo script-src (que ya incluye 'unsafe-inline').
        scriptSrcAttr: null,
        // No forzar HTTPS en subrecursos: rompe CSS/JS si se accede por HTTP.
        upgradeInsecureRequests: null,
      },
    },
  })
  .register(require('@fastify/formbody'))
  .register(fastifyStatic, { root: dashboard })
  .register(fastifyCookie, {
    hook: 'onRequest',
  } as FastifyCookieOptions)
  .register(fastifyRateLimit, {
    global: false,
    max: 20,
    timeWindow: '1 minute',
  })
  .register(routes);

export default fastify;
