import prisma from '../config/prisma-client';

// Incrementa theme_version del usuario para que la app re-descargue su tema
export async function bumpThemeVersion(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { theme_version: { increment: 1 } },
  });
}

// Incrementa theme_version de todos (cambio del tema global)
export async function bumpAllThemesVersion() {
  return prisma.user.updateMany({
    data: { theme_version: { increment: 1 } },
  });
}
