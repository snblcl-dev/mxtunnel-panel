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
  wakelock: z.boolean(),
  vibrate: z.boolean(),
  autoPing: z.boolean(),
  disableDelaySSH: z.boolean(),
  pingerSSH: z.number().int().min(0).max(999),
  limiterEnabled: z.boolean().optional(),
  limiterMessage: z.string().optional(),
});

// Valores por defecto que usa la app (Settings.java / app_preferences.xml).
// El reset guarda estos valores para que la app los re-aplique.
const DEFAULT_SETTINGS = {
  data_compression: true,
  motorSocks: 'tun',
  wakelock: true,
  vibrate: true,
  autoPing: true,
  disableDelaySSH: false,
  pingerSSH: 3,
  limiterEnabled: false,
  limiterMessage: 'Has alcanzado el número máximo de conexiones permitidas. Cierra la app en otro dispositivo o contacta al soporte.',
};

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

    if (body.action === 'reset') {
      await prisma.user.update({
        where: { id: userId },
        data: { app_settings: JSON.stringify(DEFAULT_SETTINGS) },
      });
      await bumpConfigVersion(userId);
      return ajaxOrRedirect(req, reply, '/user/app', 'Ajustes restablecidos a por defecto');
    }

    // Los checkboxes desmarcados no llegan en el body: se reconstruye con
    // valores explícitos y se guardan SIEMPRE las 9 claves (comportamiento determinista).
    const data = {
      data_compression: toBool(body.data_compression),
      motorSocks: body.motorSocks === 'hev' ? 'hev' : 'tun',
      wakelock: toBool(body.wakelock),
      vibrate: toBool(body.vibrate),
      autoPing: toBool(body.autoPing),
      disableDelaySSH: toBool(body.disableDelaySSH),
      pingerSSH: toNum(body.pingerSSH),
      limiterEnabled: toBool(body.limiterEnabled),
      limiterMessage: typeof body.limiterMessage === 'string' && body.limiterMessage.trim()
        ? body.limiterMessage.trim()
        : DEFAULT_SETTINGS.limiterMessage,
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
