import crypto from 'crypto';

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function signCSRFToken(token: string) {
  return crypto
    .createHmac('sha256', process.env.CSRF_SECRET)
    .update(token)
    .digest('hex');
}

export function verifyCSRFToken(token: string, signature: string) {
  const expected = signCSRFToken(token);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
