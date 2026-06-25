'use server';

import { prisma } from '@academia/db';
import { hashPassword } from '@/lib/password';

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

  if (!name)                        return { ok: false, error: 'El nombre es obligatorio.' };
  if (!email || !email.includes('@')) return { ok: false, error: 'Correo inválido.' };
  if (password.length < 8)          return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Z]/.test(password))      return { ok: false, error: 'La contraseña debe tener al menos una mayúscula.' };
  if (!/[0-9]/.test(password))      return { ok: false, error: 'La contraseña debe incluir al menos un número.' };
  if (password !== confirm)         return { ok: false, error: 'Las contraseñas no coinciden.' };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: 'Ya existe una cuenta con ese correo. Inicia sesión.' };

  const passwordHash = await hashPassword(password);

  const base = email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
  let username = base;
  let n = 1;
  while (await prisma.user.findFirst({ where: { username }, select: { id: true } })) {
    username = `${base}${n++}`;
  }

  await prisma.user.create({ data: { name, email, passwordHash, username } });

  return { ok: true };
}
