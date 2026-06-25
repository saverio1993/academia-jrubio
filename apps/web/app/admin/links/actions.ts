'use server';

import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

export async function createLink(_prev: { ok: boolean; message: string } | null, formData: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    const admin     = await assertAdmin();
    const fileItemId = String(formData.get('fileItemId') ?? '').trim();
    const note       = String(formData.get('note')       ?? '').trim() || null;
    const hours      = parseInt(String(formData.get('hours') ?? '24'));

    if (!fileItemId) return { ok: false, message: 'Selecciona un archivo.' };

    const file = await prisma.fileItem.findUnique({ where: { id: fileItemId }, select: { id: true } });
    if (!file)  return { ok: false, message: 'Archivo no encontrado.' };

    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
    await prisma.oneTimeLink.create({
      data: { fileItemId, createdById: admin.id, note, expiresAt },
    });

    revalidatePath('/admin/links');
    return { ok: true, message: 'Link creado.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error.' };
  }
}

export async function revokeLink(id: string): Promise<void> {
  await assertAdmin();
  await prisma.oneTimeLink.delete({ where: { id } });
  revalidatePath('/admin/links');
}
