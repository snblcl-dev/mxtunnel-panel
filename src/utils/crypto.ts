import crypto from 'crypto';

// Clave maestra que comparte la APK (32 bytes en base64). Debe coincidir con la
// clave embebida/ofuscada en VpnApp (CryptoKeys). Si no está definida, el cifrado
// queda desactivado (no romper el panel en entornos sin la variable).
function getKey(): Buffer | null {
  const raw = process.env.APP_CRYPTO_KEY;
  if (!raw) return null;
  try {
    const key = Buffer.from(raw.trim(), 'base64');
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

export function configCryptoEnabled(): boolean {
  return (process.env.CONFIG_CRYPTO_ENABLED ?? 'true') !== 'false' && getKey() !== null;
}

/**
 * Cifra un objeto como JSON en un envelope AES-256-GCM:
 * { v: 1, iv, ct, tag } (todo base64). El receptor (la app) descifra con su clave.
 */
export function encryptConfig(obj: unknown): { v: number; iv: string; ct: string; tag: string } {
  const key = getKey();
  if (!key) throw new Error('APP_CRYPTO_KEY no configurada.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { v: 1, iv: iv.toString('base64'), ct: enc.toString('base64'), tag: tag.toString('base64') };
}
