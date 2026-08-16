import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@mxtunnel.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      username,
      email,
      password: hashed,
      role: 'ADMIN',
    },
  });

  console.log(`Admin creado/verificado: ${admin.username} (id=${admin.id})`);

  await prisma.setting.upsert({
    where: { key: 'registration_enabled' },
    update: {},
    create: { key: 'registration_enabled', value: 'false' },
  });

  console.log('Setting registration_enabled=false verificado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
