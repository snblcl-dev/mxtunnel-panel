import prisma from '../config/prisma-client';

// Incrementa config_version del usuario para que la app re-descargue
export async function bumpConfigVersion(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { config_version: { increment: 1 } },
  });
}
