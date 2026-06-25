import { createHmac } from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? 'fallback-dev-secret';

export interface PendingReg {
  name:  string;
  email: string;
  hash:  string; // scrypt hash de la contraseña
  exp:   number; // timestamp ms
}

export function signPendingReg(data: PendingReg): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig     = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyPendingReg(token: string): PendingReg | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (expected !== sig) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as PendingReg;
    if (Date.now() > data.exp) return null; // expirado
    return data;
  } catch {
    return null;
  }
}
