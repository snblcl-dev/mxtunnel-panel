import type { Server, Category } from '@prisma/client';

// Prefijo del proxy para envolver la URL de CheckUser que recibe la app.
// Vacío = se entrega la URL tal cual. Ej: https://mxtunnel.pro/proxy/?url=
const PROXY_PREFIX = (process.env.PROXY_PREFIX ?? '').replace(/\/+$/, '');

function wrapWithProxy(url: string): string {
  if (!url) return '';
  if (!PROXY_PREFIX) return url;
  if (url.startsWith(PROXY_PREFIX) || url.startsWith(PROXY_PREFIX + '/')) return url;
  return `${PROXY_PREFIX}/?url=${encodeURIComponent(url)}`;
}

// Serializa un Server de Prisma al JSON plano que espera la app
// (mapeo 1:1 con SettingsConstants de com.hex.custom)
export function serializeServer(server: Server) {
  return {
    id: server.id,
    name: server.name,
    description: server.description ?? '',
    category_id: server.category_id,
    sorter: server.sorter,
    tunnelType: server.tunnel_type,
    // SSH
    sshServer: server.ssh_server ?? '',
    sshPort: server.ssh_port ?? '',
    sshUser: server.ssh_user ?? '',
    sshPass: server.ssh_pass ?? '',
    // SSL / payload / proxy
    customSNI: server.custom_sni ?? '',
    proxyPayload: server.proxy_payload ?? '',
    usarDefaultPayload: server.usar_default_payload,
    proxyIp: server.proxy_ip ?? '',
    proxyPort: server.proxy_port ?? '',
    localPort: server.local_port ?? '1080',
    // DNS
    dnsForward: server.dns_forward,
    dnsResolver1: server.dns_resolver1 ?? '',
    dnsResolver2: server.dns_resolver2 ?? '',
    udpForward: server.udp_forward,
    udpResolver: server.udp_resolver ?? '',
    // DNSTT / UDP
    udpServer: server.udp_server ?? '',
    udpAuth: server.udp_auth ?? '',
    udpObfs: server.udp_obfs ?? '',
    udpDown: server.udp_down ?? '',
    udpUp: server.udp_up ?? '',
    udpBuffer: server.udp_buffer ?? '',
    udpPort: server.udp_port ?? '',
    udpSni: server.udp_sni ?? '',
    udpVersion: server.udp_version ?? '',
    udpLineInput: server.udp_line_input ?? '',
    configLineInput: server.config_line_input ?? '',
    // V2Ray
    v2rayjson: server.v2ray_json ?? '',
    // Enhanced mode (V2)
    enhanced: server.enhanced,
    // CheckUser
    urlCheckUser: wrapWithProxy(server.url_check_user ?? ''),
  };
}

export function serializeCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    sorter: category.sorter,
  };
}
