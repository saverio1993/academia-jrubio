'use server';

import type { BillingCycle } from '@academia/db';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

const CYCLES = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME'] as const;

function parsePriceToCents(raw: string): number {
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new Error('Precio inválido');
  return Math.round(n * 100);
}

export async function updatePlan(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const billingCycle = String(formData.get('billingCycle')) as BillingCycle;
  const priceCents = parsePriceToCents(String(formData.get('price') ?? '0'));
  const sortOrder = Number(formData.get('sortOrder') ?? 0) || 0;
  const isActive = formData.get('isActive') === 'on';

  if (!id || !name) throw new Error('Datos inválidos');
  if (!CYCLES.includes(billingCycle)) throw new Error('Ciclo inválido');

  await prisma.plan.update({
    where: { id },
    data: { name, description: description || null, billingCycle, priceCents, sortOrder, isActive },
  });
  await logAudit(admin.id, 'plan.updated', `plan:${id}`, { name, priceCents, isActive });
  revalidatePath('/admin/planes');
}

export async function createPlan(formData: FormData) {
  const admin = await assertAdmin();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const billingCycle = String(formData.get('billingCycle')) as BillingCycle;
  const priceCents = parsePriceToCents(String(formData.get('price') ?? '0'));

  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Slug inválido (solo letras, números y guiones)');
  if (!name) throw new Error('Falta el nombre');
  if (!CYCLES.includes(billingCycle)) throw new Error('Ciclo inválido');

  const exists = await prisma.plan.findUnique({ where: { slug } });
  if (exists) throw new Error('Ya existe un plan con ese slug');

  const created = await prisma.plan.create({
    data: { slug, name, billingCycle, priceCents, currency: 'USD' },
  });
  await logAudit(admin.id, 'plan.created', `plan:${created.id}`, { slug, name, priceCents });
  revalidatePath('/admin/planes');
}
