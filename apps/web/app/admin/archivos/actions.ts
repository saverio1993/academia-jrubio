'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

function parseTags(raw: string): string[] {
  return String(raw ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createFile(formData: FormData) {
  const admin = await assertAdmin();
  const title = String(formData.get('title') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const storageKey = String(formData.get('storageKey') ?? '').trim();

  if (!title || !brand || !category || !storageKey) {
    throw new Error('Faltan campos obligatorios (título, marca, categoría, ruta)');
  }

  const created = await prisma.fileItem.create({
    data: {
      title,
      brand,
      category,
      storageKey,
      model: String(formData.get('model') ?? '').trim() || null,
      subcategory: String(formData.get('subcategory') ?? '').trim() || null,
      version: String(formData.get('version') ?? '').trim() || null,
      description: String(formData.get('description') ?? '').trim() || null,
      tags: parseTags(String(formData.get('tags') ?? '')),
      isPremium: formData.get('isPremium') === 'on',
    },
  });
  await logAudit(admin.id, 'file.created', `file:${created.id}`, { title, brand });
  revalidatePath('/admin/archivos');
}

export async function updateFile(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const title = String(formData.get('title') ?? '').trim();
  const brand = String(formData.get('brand') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const storageKey = String(formData.get('storageKey') ?? '').trim();
  if (!id || !title || !brand || !category || !storageKey) throw new Error('Datos inválidos');

  await prisma.fileItem.update({
    where: { id },
    data: {
      title,
      brand,
      category,
      storageKey,
      model: String(formData.get('model') ?? '').trim() || null,
      subcategory: String(formData.get('subcategory') ?? '').trim() || null,
      version: String(formData.get('version') ?? '').trim() || null,
      tags: parseTags(String(formData.get('tags') ?? '')),
      isPremium: formData.get('isPremium') === 'on',
    },
  });
  await logAudit(admin.id, 'file.updated', `file:${id}`, { title });
  revalidatePath('/admin/archivos');
}

export async function deleteFile(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  if (!id) throw new Error('Archivo inválido');
  await prisma.fileItem.delete({ where: { id } });
  await logAudit(admin.id, 'file.deleted', `file:${id}`);
  revalidatePath('/admin/archivos');
}

export async function generateOneTimeLink(
  _prev: { url: string } | null,
  formData: FormData,
): Promise<{ url: string }> {
  const admin = await assertAdmin();
  const fileId = String(formData.get('fileId'));
  const days = Math.min(Math.max(Number(formData.get('days') ?? 7), 1), 30);
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!fileId) throw new Error('Archivo inválido');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const link = await prisma.oneTimeLink.create({
    data: { fileItemId: fileId, createdById: admin.id, expiresAt, note },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const url = `${appUrl}/dl/${link.token}`;

  await logAudit(admin.id, 'file.onetimelink.created', `file:${fileId}`, { url, days, note });
  return { url };
}
