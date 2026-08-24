import prisma from '../config/prisma-client';

// Incrementa theme_version del usuario para que la app re-descargue su tema.
// Los errores se capturan para no romper la operación principal.
export async function bumpThemeVersion(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { theme_version: { increment: 1 } },
    });
  } catch {
    // no crítico: la app re-descargará en el próximo polling
  }
}
