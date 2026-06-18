'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
type Role = (typeof ROLES)[number];

export async function changeRole(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get('userId'));
  const role = String(formData.get('role')) as Role;
  if (!userId || !ROLES.includes(role)) throw new Error('Datos inválidos');

  // Evita que el admin se quite a sí mismo el último acceso por accidente
  if (userId === admin.id && role !== 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) throw new Error('No puedes quitar el último administrador');
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logAudit(admin.id, 'user.role.changed', `user:${userId}`, { role });
  revalidatePath('/admin/usuarios');
}
