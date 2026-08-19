import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import AdminAuthentication from '../../../middlewares/admin-authentication';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/app',
  method: 'GET',
  onRequest: [Authentication, AdminAuthentication],
  handler: (req: FastifyRequest, reply: FastifyReply) => {
    return Render.page(req, reply, '/admin/app.html', { active: 'app' });
  },
} as RouteOptions;
