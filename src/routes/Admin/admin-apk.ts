import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import prisma from '../../config/prisma-client';
import { Render } from '../../config/render-config';
import RequireCSRF from '../../middlewares/require-csrf';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { ajaxFail } from '../../utils/ajax';
import { buildApk, cleanOldApks, PKG_REGEX } from '../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const generateSchema = z.object({
  userId: z.string().min(1),
  package: z.string().regex(PKG_REGEX, 'Package inválido. Usa com.ejemplo.app'),
  name: z.string().min(1).max(40),
  icon: z.string().optional().or(z.literal('')),
});

function outputDir(): string {
  return process.env.APK_OUTPUT_DIR || path.resolve(process.cwd(), 'uploads', 'apk');
}

function listApks(): { file: string; size: number; mtime: Date }[] {
  try {
    const dir = outputDir();
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.apk'))
      .map((f) => {
        const st = fs.statSync(path.join(dir, f));
        return { file: f, size: st.size, mtime: st.mtime };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }
}

export default [
  {
    url: '/admin/apk',
    method: 'GET',
    onRequest: [AdminAuthentication],
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const users = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        orderBy: { created_at: 'desc' },
        select: { id: true, username: true, email: true, apk_package: true, apk_name: true, apk_generated: true },
      });
      cleanOldApks();
      return Render.page(req, reply, '/admin/apk.html', {
        active: 'apk',
        users,
        apks: listApks(),
      });
    },
  },
  {
    url: '/admin/apk/generate',
    method: 'POST',
    onRequest: [AdminAuthentication],
    preHandler: [RequireCSRF],
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = req.body as Record<string, any>;
      const parsed = generateSchema.safeParse(body);
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
  },
  {
    url: '/admin/apk/download/:file',
    method: 'GET',
    onRequest: [AdminAuthentication],
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const file = (req.params as any).file;
      if (!file || !/^[\w.\-]+\.apk$/.test(file)) {
        return reply.status(400).send('Nombre de archivo inválido.');
      }
      const full = path.join(outputDir(), file);
      if (!fs.existsSync(full)) {
        return reply.status(404).send('APK no encontrada o expirada (se borra a las 3 horas).');
      }
      return reply.header('Content-Disposition', `attachment; filename="${file}"`).send(fs.createReadStream(full));
    },
  },
] as RouteOptions[];
