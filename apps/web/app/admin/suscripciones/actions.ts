'use server';

import type { SubscriptionStatus } from '@academia/db';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

const STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'SUSPENDED'] as const;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function updateSubscription(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const status = String(formData.get('status')) as SubscriptionStatus;
  const expiresRaw = String(formData.get('expiresAt') ?? '').trim();
  if (!id || !STATUSES.includes(status)) throw new Error('Datos inválidos');

  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;

  await prisma.subscription.update({
    where: { id },
    data: {
      status,
      expiresAt,
      canceledAt: status === 'CANCELED' ? new Date() : null,
    },
  });
  await logAudit(admin.id, 'subscription.updated', `subscription:${id}`, { status });
  revalidatePath('/admin/suscripciones');
  revalidatePath('/admin');
}

export async function grantSubscription(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get('userId'));
  const planId = String(formData.get('planId'));
  const days = Number(formData.get('days') ?? 0) || 0;

  if (!userId || !planId) throw new Error('Selecciona usuario y plan');

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error('Plan no encontrado');

  // LIFETIME o días=0 => sin vencimiento
  const expiresAt = plan.billingCycle === 'LIFETIME' || days === 0 ? null : daysFromNow(days);

  const sub = await prisma.subscription.create({
    data: { userId, planId, status: 'ACTIVE', expiresAt },
  });
  await logAudit(admin.id, 'subscription.granted', `subscription:${sub.id}`, {
    userId,
    planId,
    days,
  });
  revalidatePath('/admin/suscripciones');
  revalidatePath('/admin');
}
