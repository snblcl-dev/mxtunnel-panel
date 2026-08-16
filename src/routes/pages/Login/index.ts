import { Render } from '../../../config/render-config';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/login',
  method: 'GET',
  handler: (req: FastifyRequest, reply: FastifyReply) => {
    if ((req as any).user && (req as any).user.id) return reply.redirect('/');
    return Render.page(req, reply, '/login/index.html');
  },
} as RouteOptions;
