'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';

export async function updateProfile(
  _prev: { ok: boolean; text: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; text: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, text: 'No autenticado' };

    const name     = String(formData.get('name')     ?? '').trim();
    const username = String(formData.get('username') ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!name)     return { ok: false, text: 'El nombre no puede estar vacío' };
    if (username && username.length < 3) return { ok: false, text: 'El usuario debe tener al menos 3 caracteres' };

    // Verificar que el username no lo use otro
    if (username) {
      const taken = await prisma.user.findFirst({
        where: { username, NOT: { id: session.user.id } },
        select: { id: true },
      });
      if (taken) return { ok: false, text: 'Ese nombre de usuario ya está en uso' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, ...(username ? { username } : {}) },
    });

    revalidatePath('/perfil');
    revalidatePath('/dashboard');
    return { ok: true, text: 'Perfil actualizado' };
  } catch {
    return { ok: false, text: 'Error al guardar' };
  }
}
