'use server';

import { cookies } from 'next/headers';
import { prisma } from '@academia/db';
import { hashPassword } from '@/lib/password';
import { signPendingReg } from '@/lib/pending-reg';

export type RegisterResult =
  | { ok: false; error: string }
  | { ok: true };

export async function registerUser(
  _prev: RegisterResult | null,
  formData: FormData,
): Promise<RegisterResult> {
  const name     = String(formData.get('name')     ?? '').trim();
  const email    = String(formData.get('email')    ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirm  = String(formData.get('confirm')  ?? '');

  if (!name)                          return { ok: false, error: 'El nombre es obligatorio.' };
  if (!email || !email.includes('@')) return { ok: false, error: 'Correo inválido.' };
  if (password.length < 8)            return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Z]/.test(password))        return { ok: false, error: 'Debe incluir al menos una mayúscula.' };
  if (!/[0-9]/.test(password))        return { ok: false, error: 'Debe incluir al menos un número.' };
  if (password !== confirm)           return { ok: false, error: 'Las contraseñas no coinciden.' };

  // Verificar que el correo no esté en uso
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: 'Ya existe una cuenta con ese correo. Inicia sesión.' };

  // Hashear contraseña y guardar en cookie firmada — la cuenta se crea al confirmar el pago
  const hash  = await hashPassword(password);
  const token = signPendingReg({ name, email, hash, exp: Date.now() + 2 * 3600 * 1000 });

  const jar = await cookies();
  jar.set('_pending_reg', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7200, // 2 horas
    path:     '/',
  });

  return { ok: true };
}
