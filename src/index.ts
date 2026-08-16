import 'dotenv/config';
import fastify from './http';
import prisma from './config/prisma-client';

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
