import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

type Params = { sid: string };

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category_id: z.coerce.number().int(),
  sorter: z.coerce.number().int().default(0),
  tunnel_type: z.coerce.number().int().min(1).max(12).default(1),
  ssh_server: z.string().optional(),
  ssh_port: z.string().optional(),
  ssh_user: z.string().optional(),
  ssh_pass: z.string().optional(),
  custom_sni: z.string().optional(),
  proxy_payload: z.string().optional(),
  usar_default_payload: z.string().optional(),
  proxy_ip: z.string().optional(),
  proxy_port: z.string().optional(),
  local_port: z.string().optional().default('1080'),
  dns_forward: z.string().optional(),
  dns_resolver1: z.string().optional(),
  dns_resolver2: z.string().optional(),
  udp_forward: z.string().optional(),
  udp_resolver: z.string().optional(),
  udp_server: z.string().optional(),
  udp_auth: z.string().optional(),
  udp_obfs: z.string().optional(),
  udp_down: z.string().optional(),
  udp_up: z.string().optional(),
  udp_buffer: z.string().optional(),
  udp_port: z.string().optional(),
  udp_sni: z.string().optional(),
  udp_version: z.string().optional(),
  udp_line_input: z.string().optional(),
  config_line_input: z.string().optional(),
  v2ray_json: z.string().optional(),
  enhanced: z.string().optional(),
});

const orEmpty = (v?: string) => v ?? '';

export default {
  url: '/user/servers/:sid',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const { sid } = req.params as Params;
    const body = req.body as Record<string, any>;
    const { action } = body;

    const server = await prisma.server.findFirst({
      where: { id: Number(sid), user_id: userId },
    });
    if (!server) return ajaxFail(reply, 'No encontrado', 404);

    if (action === 'toggle') {
      await prisma.server.update({
        where: { id: server.id },
        data: { status: server.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/servers', 'Estado actualizado');
    } else if (action === 'delete') {
      await prisma.server.delete({ where: { id: server.id } });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/servers', 'Servidor eliminado');
    } else if (action === 'update') {
      const parsed = schema.safeParse(body);
      if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');
      const d = parsed.data;
      const cat = await prisma.category.findFirst({ where: { id: d.category_id, user_id: userId } });
      if (!cat) return ajaxFail(reply, 'Categoría inválida.');

      await prisma.server.update({
        where: { id: server.id },
        data: {
          name: d.name, description: d.description ?? '',
          category_id: d.category_id, sorter: d.sorter, tunnel_type: d.tunnel_type,
          ssh_server: orEmpty(d.ssh_server), ssh_port: orEmpty(d.ssh_port),
          ssh_user: orEmpty(d.ssh_user), ssh_pass: orEmpty(d.ssh_pass),
          custom_sni: orEmpty(d.custom_sni), proxy_payload: orEmpty(d.proxy_payload),
          usar_default_payload: d.usar_default_payload !== undefined ? d.usar_default_payload === '1' : true,
          proxy_ip: orEmpty(d.proxy_ip), proxy_port: orEmpty(d.proxy_port),
          local_port: d.local_port || '1080',
          dns_forward: d.dns_forward !== undefined ? d.dns_forward === '1' : true,
          dns_resolver1: orEmpty(d.dns_resolver1), dns_resolver2: orEmpty(d.dns_resolver2),
          udp_forward: d.udp_forward !== undefined ? d.udp_forward === '1' : true,
          udp_resolver: orEmpty(d.udp_resolver),
          udp_server: orEmpty(d.udp_server), udp_auth: orEmpty(d.udp_auth),
          udp_obfs: orEmpty(d.udp_obfs), udp_down: orEmpty(d.udp_down),
          udp_up: orEmpty(d.udp_up), udp_buffer: orEmpty(d.udp_buffer),
          udp_port: orEmpty(d.udp_port), udp_sni: orEmpty(d.udp_sni),
          udp_version: orEmpty(d.udp_version),
          udp_line_input: orEmpty(d.udp_line_input), config_line_input: orEmpty(d.config_line_input),
          v2ray_json: orEmpty(d.v2ray_json),
          enhanced: d.enhanced !== undefined ? d.enhanced === '1' : true,
        },
      });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/servers', 'Servidor actualizado');
    }
    return ajaxFail(reply, 'Acción inválida.');
  },
} as RouteOptions;
