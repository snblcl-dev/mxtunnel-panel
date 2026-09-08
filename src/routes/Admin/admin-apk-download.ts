import * as fs from 'fs';
import * as path from 'path';
import AdminAuthentication from '../../middlewares/admin-authentication';
import { userApkDir } from '../../utils/apk-builder';
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify';

export default {
  url: '/admin/apk/download/:userId/:file',
  method: 'GET',
  onRequest: [AdminAuthentication],
  handler: async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId, file } = req.params as any;
    if (!file || !/^[\w.\-]+\.apk$/.test(file)) {
      return reply.status(400).send('Nombre de archivo inválido.');
    }
    const full = path.join(userApkDir(userId), file);
    if (!fs.existsSync(full)) {
      return reply.status(404).send('APK no encontrada o expirada (se borra a las 3 horas).');
    }
    return reply.header('Content-Disposition', `attachment; filename="${file}"`).send(fs.createReadStream(full));
  },
} as RouteOptions;
