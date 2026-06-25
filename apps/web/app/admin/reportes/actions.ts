'use server';

import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed') {
  const admin = await assertAdmin();
  await prisma.fileReport.update({
    where: { id: reportId },
    data:  { status, resolvedAt: new Date(), resolvedBy: admin.id },
  });
  revalidatePath('/admin/reportes');
}
