export function isValidHttpUrl(v: string | undefined): boolean {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// La app solo normaliza v2ray como JSON cuando el valor empieza con "{".
// Si empieza con "{", debe ser JSON válido; cualquier otro formato se acepta
// (p. ej. base64 o enlaces) para no romper configs existentes.
export function isValidV2rayJson(v: string | undefined): boolean {
  if (!v) return true;
  const trimmed = v.trim();
  if (!trimmed.startsWith('{')) return true;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
