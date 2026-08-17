import { FastifyReply, FastifyRequest } from 'fastify';

export function isAjax(req: FastifyRequest): boolean {
  const q = (req.query as any)?.ajax;
  return q === '1' || req.headers['x-requested-with'] === 'XMLHttpRequest';
}

export function ajaxOk(reply: FastifyReply, message = 'Guardado') {
  return reply.send({ ok: true, message });
}

export function ajaxOrRedirect(
  req: FastifyRequest,
  reply: FastifyReply,
  redirectUrl: string,
  message = 'Guardado'
) {
  if (isAjax(req)) return ajaxOk(reply, message);
  return reply.redirect(redirectUrl);
}

export function ajaxFail(reply: FastifyReply, message: string, code = 400) {
  return reply.status(code).send({ ok: false, message });
}
