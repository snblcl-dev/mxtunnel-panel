import crypto from 'crypto';

const SEPARATOR = '.';

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Crea el token de doble envío firmado: "<aleatorio>.<firma>" .
// La firma HMAC evita fijación/forja del token (un atacante no puede
// inventar un valor válido sin conocer CSRF_SECRET).
export function createCSRFToken() {
  const token = generateCSRFToken();
  const signature = signCSRFToken(token);
  return `${token}${SEPARATOR}${signature}`;
}

export function signCSRFToken(token: string) {
  return crypto
    .createHmac('sha256', process.env.CSRF_SECRET)
    .update(token)
    .digest('hex');
}

export function verifyCSRFToken(token: string, signature: string) {
  const expected = signCSRFToken(token);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Valida el valor completo "<token>.<firma>" usado en cookie y body.
export function validateCSRFToken(value: unknown): boolean {
  if (typeof value !== 'string' || !value) return false;
  const idx = value.lastIndexOf(SEPARATOR);
  if (idx <= 0) return false;
  const token = value.slice(0, idx);
  const signature = value.slice(idx + 1);
  if (!token || !signature) return false;
  return verifyCSRFToken(token, signature);
}
