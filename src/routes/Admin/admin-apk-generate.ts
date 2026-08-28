import { z } from 'zod';
import prisma from '../../config/prisma-client';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { ajaxFail } from '../../utils/ajax';
import { buildApk, PKG_REGEX } from '../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const schema = z.object({
  userId: z.string().min(1),
  package: z.string().regex(PKG_REGEX, 'Package inválido. Usa com.ejemplo.app'),
  name: z.string().min(1).max(40),
  icon: z.string().optional().or(z.literal('')),
});

export default {
  url: '/admin/apk/generate',
  method: 'POST',
  onRequest: [AdminAuthentication],
  preHandler: [RequireCSRF],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, any>;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return ajaxFail(reply, parsed.error?.issues?.[0]?.message || 'Datos inválidos.');
    }
    const { userId, package: pkg, name, icon } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return ajaxFail(reply, 'Usuario no encontrado', 404);

    try {
      const result = await buildApk({
        userId,
        package: pkg,
        name,
        iconBase64: icon || undefined,
        token: user.id,
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          apk_package: pkg,
          apk_name: name,
          apk_icon: icon || undefined,
          apk_generated: true,
          apk_updated_at: new Date(),
        },
      });

      return reply.send({ ok: true, message: 'APK generada', file: result.file, size: result.size });
    } catch (err: any) {
      return ajaxFail(reply, `Error al generar: ${err?.message || 'desconocido'}`, 500);
    }
  },
} as RouteOptions;
