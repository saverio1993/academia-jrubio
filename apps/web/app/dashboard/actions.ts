'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';

export async function updateOwnName(formData: FormData): Promise<{ ok: boolean; text: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, text: 'No autenticado' };

    const name = String(formData.get('name') ?? '').trim();
    if (!name) return { ok: false, text: 'El nombre no puede estar vacío' };

    await prisma.user.update({ where: { id: session.user.id }, data: { name } });
    revalidatePath('/dashboard');
    return { ok: true, text: 'Nombre actualizado' };
  } catch {
    return { ok: false, text: 'Error al guardar' };
  }
}
