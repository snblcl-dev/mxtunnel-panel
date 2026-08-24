import 'dotenv/config';
import fastify from './http';
import prisma from './config/prisma-client';

const WEAK_DEFAULTS: Record<string, string[]> = {
  JWT_SECRET_KEY: ['change-me-mxtunnel-secret-key', ''],
  JWT_SECRET_REFRESH: ['change-me-mxtunnel-refresh-secret', ''],
  CSRF_SECRET: ['change-me-mxtunnel-csrf-secret', ''],
};

function assertSecrets() {
  for (const [name, badValues] of Object.entries(WEAK_DEFAULTS)) {
    const value = process.env[name] ?? '';
    if (badValues.includes(value)) {
      console.error(`[Seguridad] ${name} usa un valor por defecto inseguro. Cámbialo en .env antes de arrancar.`);
      process.exit(1);
    }
    if (value.length < 32) {
      console.warn(`[Advertencia] ${name} tiene menos de 32 caracteres. Considera usar un valor más largo.`);
    }
  }
}

assertSecrets();

prisma.$connect();

const host = '0.0.0.0';
const port = Number(process.env.PORT) || 3000;

fastify.listen({ host, port }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`MXTunnel Panel corriendo en http://localhost:${port}`);
});
