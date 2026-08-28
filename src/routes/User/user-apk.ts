import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import prisma from '../../config/prisma-client';
import { Render } from '../../config/render-config';
import RequireCSRF from '../../middlewares/require-csrf';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { ajaxFail } from '../../utils/ajax';
import { buildApk, cleanOldApks, PKG_REGEX } from '../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

const generateSchema = z.object({
  package: z.string().regex(PKG_REGEX, 'Package inválido. Usa com.ejemplo.app'),
  name: z.string().min(1).max(40),
  icon: z.string().optional().or(z.literal('')),
});

function outputDir(): string {
  return process.env.APK_OUTPUT_DIR || path.resolve(process.cwd(), 'uploads', 'apk');
}

/** Lista los APKs generados (solo los que existen, ordenados por fecha desc). */
function listUserApks(): { file: string; size: number; mtime: Date }[] {
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
    url: '/user/apk',
    method: 'GET',
    onRequest: [Authentication, UserActive],
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user.id;
      const me = await prisma.user.findUnique({ where: { id: userId } });
      if (!me) return reply.redirect('/login');
      cleanOldApks();
      return Render.page(req, reply, '/user/apk.html', {
        active: 'apk',
        me,
        apks: listUserApks(),
      });
    },
  },
  {
    url: '/user/apk/generate',
    method: 'POST',
    onRequest: [Authentication, UserActive],
    preHandler: [RequireCSRF],
    handler: async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user.id;
      const body = req.body as Record<string, any>;
      const parsed = generateSchema.safeParse(body);
      if (!parsed.success) {
        return ajaxFail(reply, parsed.error?.issues?.[0]?.message || 'Datos inválidos.');
      }
      const { package: pkg, name, icon } = parsed.data;

      const me = await prisma.user.findUnique({ where: { id: userId } });
      if (!me) return ajaxFail(reply, 'Usuario no encontrado', 404);

      try {
        const result = await buildApk({
          userId,
          package: pkg,
          name,
          iconBase64: icon || undefined,
          token: me.id,
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
    url: '/user/apk/download/:file',
    method: 'GET',
    onRequest: [Authentication, UserActive],
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
