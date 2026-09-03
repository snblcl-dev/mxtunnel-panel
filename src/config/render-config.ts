import path from 'path';
import { eta } from '../http';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mapeo tunnel_type (numero) -> nombre en la app VpnApp, reutilizado por las
// plantillas Eta para mostrar el tipo de conexion en tablas de servidores.
// Solo los modos implementados en VpnApp: 1..6, 10 y 13 (BHTTP).
export const TUNNEL_TYPES: Record<number, string> = {
  1: 'SSH + Payload',
  2: 'SSH + Proxy + Payload',
  3: 'SSH_SSL + SNI',
  4: 'SSH_SSL + SNI + Payload',
  5: 'SlowDNS / DNSTT',
  6: 'SSH_SSL + SNI + Proxy + Payload',
  10: 'V2Ray',
  13: 'BHTTP (Tunnel SSH)',
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