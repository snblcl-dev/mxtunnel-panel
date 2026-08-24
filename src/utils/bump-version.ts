import prisma from '../config/prisma-client';

// Incrementa config_version del usuario para que la app re-descargue.
// Nunca debe romper la operación principal (p. ej. si el usuario fue borrado
// entre medias), así que los errores se capturan silenciosamente.
export async function bumpConfigVersion(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { config_version: { increment: 1 } },
    });
  } catch {
    // no crítico: la app re-descargará en el próximo polling
  }
}
