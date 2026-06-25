'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';

const VALID_REASONS = ['danado','no_compatible','version_incorrecta','enlace_roto','otro'];

export async function submitReport({
  fileItemId, reason, comment,
}: {
  fileItemId: string;
  reason: string;
  comment?: string;
}): Promise<{ ok: boolean; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Debes iniciar sesión para reportar.' };
  if (!VALID_REASONS.includes(reason)) return { ok: false, error: 'Motivo inválido.' };

  const existing = await prisma.fileReport.findFirst({
    where: { userId: session.user.id, fileItemId },
    select: { id: true },
  });
  if (existing) return { ok: false, error: 'Ya enviaste un reporte para este archivo.' };

  await prisma.fileReport.create({
    data: { userId: session.user.id, fileItemId, reason, comment: comment || null },
  });

  return { ok: true, error: '' };
}
