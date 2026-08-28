import * as fs from 'fs';
import * as path from 'path';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

function outputDir(): string {
  return process.env.APK_OUTPUT_DIR || path.resolve(process.cwd(), 'uploads', 'apk');
}

export default {
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
} as RouteOptions;
