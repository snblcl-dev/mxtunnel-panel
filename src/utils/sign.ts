import crypto from 'crypto';
import { FastifyRequest } from 'fastify';

/**
 * Firma de peticiones del canal config/tema de VpnApp.
 *
 * Esquema:
 *   X-Sig = base64( HMAC-SHA256(authKey, "GET\n<path>\n<ts>\n<nonce>") )
 * con authKey = HMAC(APP_CRYPTO_KEY, "vpnapp:auth:<userId>") (solo server).
 * El servidor exige X-Ts (epoch segundos), X-Nonce y X-Sig; ventana de reloj
 * ±WINDOW_SECONDS y anti-replay por nonce.
 *
 * APP_CRYPTO_KEY NUNCA viaja en la APK: en el cliente solo existe el pkey.enc
 * por usuario, desenvuelto por el .so nativo.
 */

const WINDOW_SECONDS = 180;

function master(): Buffer {
  const raw = process.env.APP_CRYPTO_KEY;
  if (!raw) throw new Error('APP_CRYPTO_KEY no configurada.');
  const key = Buffer.from(raw.trim(), 'base64');
  if (key.length !== 32) throw new Error('APP_CRYPTO_KEY debe ser 32 bytes.');
  return key;
}

export function deriveAuthKey(userId: string): Buffer {
  return crypto.createHmac('sha256', master()).update('vpnapp:auth:' + userId).digest();
}

export function deriveEncKey(userId: string): Buffer {
  return crypto.createHmac('sha256', master()).update('vpnapp:enc:' + userId).digest();
}

function canonical(method: string, path: string, ts: string, nonce: string): string {
  return method + '\n' + path + '\n' + ts + '\n' + nonce;
}

/** Cache anti-replay: nonce -> expira (epoch ms). Poda perezosa. */
const seenNonces = new Map<string, number>();
function isReplay(nonce: string): boolean {
  const now = Date.now();
  if (seenNonces.size > 5000) {
    for (const [k, exp] of seenNonces) {
      if (exp < now) seenNonces.delete(k);
    }
  }
  const exp = seenNonces.get(nonce);
  if (exp !== undefined && exp > now) return true;
  seenNonces.set(nonce, now + (WINDOW_SECONDS + 5) * 1000);
  return false;
}

export type SigError = { status: number; message: string };

/**
 * Valida la firma de la petición para userId.
 * Devuelve null si es válida o un {status,message} de error.
 */
export function verifyRequestSignature(req: FastifyRequest, userId: string): SigError | null {
  const ts = req.headers['x-ts'];
  const nonce = req.headers['x-nonce'];
  const sig = req.headers['x-sig'];
  if (!ts || typeof ts !== 'string' || !nonce || typeof nonce !== 'string' ||
      !sig || typeof sig !== 'string') {
    return { status: 401, message: 'Falta la firma de la petición.' };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > WINDOW_SECONDS) {
    return { status: 401, message: 'Firma expirada.' };
  }

  if (isReplay(nonce)) {
    return { status: 401, message: 'Firma repetida.' };
  }

  const path = (req.url || '/').split('?')[0];
  const method = (req.method || 'GET').toUpperCase();
  const canonicalStr = canonical(method, path, ts, nonce);
  const expected = crypto.createHmac('sha256', deriveAuthKey(userId))
    .update(canonicalStr, 'utf8').digest();

  let actual: Buffer;
  try {
    actual = Buffer.from(sig, 'base64');
  } catch {
    return { status: 401, message: 'Firma inválida.' };
  }
  if (actual.length !== expected.length ||
      !crypto.timingSafeEqual(expected, actual)) {
    return { status: 401, message: 'Firma inválida.' };
  }
  return null;
}
