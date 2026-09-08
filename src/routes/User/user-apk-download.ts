import * as fs from 'fs';
import * as path from 'path';
import Authentication from '../../middlewares/authentication';
import UserActive from '../../middlewares/user-active';
import { userApkDir } from '../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/user/apk/download/:file',
  method: 'GET',
  onRequest: [Authentication, UserActive],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const file = (req.params as any).file;
    if (!file || !/^[\w.\-]+\.apk$/.test(file)) {
      return reply.status(400).send('Nombre de archivo inválido.');
    }
    const userId = (req as any).user.id;
    const full = path.join(userApkDir(userId), file);
    if (!fs.existsSync(full)) {
      return reply.status(404).send('APK no encontrada o expirada (se borra a las 3 horas).');
    }
    return reply.header('Content-Disposition', `attachment; filename="${file}"`).send(fs.createReadStream(full));
  },
} as RouteOptions;
