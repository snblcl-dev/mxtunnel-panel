import path from 'path';
import { eta } from '../http';
import { FastifyRequest, FastifyReply } from 'fastify';

const pages = path.resolve(process.cwd(), 'frontend', 'pages');

export class Render {
  static page(
    req: FastifyRequest,
    reply: FastifyReply,
    filename: string,
    options: Record<string, any> = {}
  ) {
    const file = path.join(pages, filename);
    const content = eta.readFile(file);
    const res = eta.renderString(content, {
      ...options,
      user: (req as any).user || null,
      csrfToken: (req as any).csrfToken || '',
    });
    reply.header('Content-Type', 'text/html');
    return reply.send(res);
  }
}
