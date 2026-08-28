import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../../config/prisma-client';
import { Render } from '../../../config/render-config';
import Authentication from '../../../middlewares/authentication';
import UserActive from '../../../middlewares/user-active';
import { cleanOldApks } from '../../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

function outputDir(): string {
  return process.env.APK_OUTPUT_DIR || path.resolve(process.cwd(), 'uploads', 'apk');
}

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

export default {
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
} as RouteOptions;
