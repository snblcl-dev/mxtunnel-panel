export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isExpired(expirationDate: Date | string | null | undefined): boolean {
  if (!expirationDate) return false;
  const d = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  return Date.now() >= d.getTime();
}
