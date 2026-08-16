import { Eta } from 'eta';
import * as path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fastifyCookie, { type FastifyCookieOptions } from '@fastify/cookie';

const dashboard = path.resolve(process.cwd(), 'frontend', 'public');

const fastify = Fastify({ ignoreTrailingSlash: true });
export const eta = new Eta();

import routes from './routes/handle-routes';

fastify
  .register(cors, { origin: true, credentials: true })
  .register(helmet, { contentSecurityPolicy: false })
  .register(require('@fastify/formbody'))
  .register(fastifyStatic, { root: dashboard })
  .register(fastifyCookie, {
    hook: 'onRequest',
  } as FastifyCookieOptions)
  .register(routes);

export default fastify;
