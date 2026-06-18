'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

export async function approvePayment(formData: FormData) {
  const admin = await assertAdmin();
  const paymentId = String(formData.get('paymentId'));
  if (!paymentId) throw new Error('Pago inválido');

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'SUCCEEDED', approvedById: admin.id, approvedAt: new Date() },
  });
  await logAudit(admin.id, 'payment.approved', `payment:${paymentId}`);
  revalidatePath('/admin/pagos');
  revalidatePath('/admin');
}

export async function rejectPayment(formData: FormData) {
  const admin = await assertAdmin();
  const paymentId = String(formData.get('paymentId'));
  const notes = String(formData.get('notes') ?? '').trim();
  if (!paymentId) throw new Error('Pago inválido');

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REJECTED',
      approvedById: admin.id,
      approvedAt: new Date(),
      notes: notes || undefined,
    },
  });
  await logAudit(admin.id, 'payment.rejected', `payment:${paymentId}`, { notes });
  revalidatePath('/admin/pagos');
  revalidatePath('/admin');
}
