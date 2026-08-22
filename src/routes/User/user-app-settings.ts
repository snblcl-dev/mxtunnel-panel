import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { ajaxOrRedirect, ajaxFail } from '../../utils/ajax';
import { bumpConfigVersion } from '../../utils/bump-version';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  data_compression: z.boolean(),
  motorSocks: z.enum(['tun', 'hev']),
  hideLog: z.boolean(),
  wakelock: z.boolean(),
  vibrate: z.boolean(),
  autoPing: z.boolean(),
  tetherSubnet: z.boolean(),
  disableDelaySSH: z.boolean(),
  pingerSSH: z.number().int().min(0).max(999),
});

function toBool(v: any): boolean {
  return v === true || v === 'true' || v === 'on' || v === '1';
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isNaN(n) ? 3 : n;
}

export default {
  url: '/user/app/settings',
  method: 'POST',
  onRequest: [Authentication, UserActive],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).user.id;
    const body = req.body as Record<string, any>;

    // Los checkboxes desmarcados no llegan en el body: se reconstruye con
    // valores explícitos y se guardan SIEMPRE las 9 claves (comportamiento determinista).
    const data = {
      data_compression: toBool(body.data_compression),
      motorSocks: body.motorSocks === 'hev' ? 'hev' : 'tun',
      hideLog: toBool(body.hideLog),
      wakelock: toBool(body.wakelock),
      vibrate: toBool(body.vibrate),
      autoPing: toBool(body.autoPing),
      tetherSubnet: toBool(body.tetherSubnet),
      disableDelaySSH: toBool(body.disableDelaySSH),
      pingerSSH: toNum(body.pingerSSH),
    };

    const parsed = schema.safeParse(data);
    if (!parsed.success) return ajaxFail(reply, 'Datos inválidos.');

    await prisma.user.update({
      where: { id: userId },
      data: { app_settings: JSON.stringify(parsed.data) },
    });

    await bumpConfigVersion(userId);
    return ajaxOrRedirect(req, reply, '/user/app', 'Ajustes guardados');
  },
} as RouteOptions;
