import path from 'path';
import { eta } from '../http';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mapeo tunnel_type (numero) -> nombre legible, reutilizado por las
// plantillas Eta para mostrar el tipo de conexion en tablas de servidores.
export const TUNNEL_TYPES: Record<number, string> = {
  1: 'SSH Directo',
  2: 'SSH Proxy',
  3: 'SSH SSL',
  4: 'SSL Payload',
  5: 'SlowDNS',
  6: 'SSL RP',
  7: 'SSH',
  8: 'RE',
  9: 'UDP',
  10: 'V2Ray',
  12: 'DNSTT + V2Ray',
};

export function tunnelTypeName(n: number | string | null | undefined): string {
  const key = Number(n);
  return TUNNEL_TYPES[key] || (n != null ? `Tipo ${n}` : '—');
}

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
      user: (req as any).user || null,
      csrfToken: (req as any).csrfToken || '',
      tunnelTypeName,
      ...options,
    });
    reply.header('Content-Type', 'text/html');
    return reply.send(res);
  }
}