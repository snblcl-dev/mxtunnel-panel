import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/app',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: (req: FastifyRequest, reply: FastifyReply) => {
    return Render.page(req, reply, '/user/app.html', { active: 'app' });
  },
} as RouteOptions;
