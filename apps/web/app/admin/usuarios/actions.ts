'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

const ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;
type Role = (typeof ROLES)[number];

type CreateResult = { ok: boolean; message: string };

export async function createUser(_prev: CreateResult | null, formData: FormData): Promise<CreateResult> {
  try {
    const admin = await assertAdmin();

    const email      = String(formData.get('email')     ?? '').trim().toLowerCase();
    const name       = String(formData.get('name')      ?? '').trim() || null;
    const role       = String(formData.get('role')      ?? 'USER') as Role;
    const planRaw    = String(formData.get('planId')    ?? '').trim();
    const expiresRaw = String(formData.get('expiresAt') ?? '').trim();

    if (!email) return { ok: false, message: 'El correo es obligatorio.' };
    if (!ROLES.includes(role)) return { ok: false, message: 'Rol inválido.' };

    const wantsSub  = planRaw && planRaw !== 'none';
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;

    if (wantsSub && !expiresAt) {
      return { ok: false, message: 'Indica la fecha de vencimiento.' };
    }

    // Resolver planId: "gratis" → buscar o crear plan gratuito
    let resolvedPlanId: string | null = null;
    if (wantsSub) {
      if (planRaw === 'gratis') {
        let gratisPlan = await prisma.plan.findFirst({ where: { slug: 'gratis' } });
        if (!gratisPlan) {
          gratisPlan = await prisma.plan.create({
            data: {
              slug: 'gratis', name: 'Gratis', priceCents: 0,
              billingCycle: 'MONTHLY', isActive: true,
            },
          });
        }
        resolvedPlanId = gratisPlan.id;
      } else {
        const found = await prisma.plan.findUnique({ where: { id: planRaw } });
        if (!found) return { ok: false, message: 'Plan no encontrado.' };
        resolvedPlanId = found.id;
      }
    }

    // Crear o actualizar usuario
    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role, ...(name ? { name } : {}) },
      });
      userId = existing.id;
    } else {
      const created = await prisma.user.create({ data: { email, name, role } });
      userId = created.id;
    }

    // Crear suscripción
    if (resolvedPlanId && expiresAt) {
      await prisma.subscription.create({
        data: { userId, planId: resolvedPlanId, status: 'ACTIVE', startedAt: new Date(), expiresAt },
      });
    }

    await logAudit(admin.id, 'user.created_manual', `user:${userId}`, { email, role, plan: planRaw });
    revalidatePath('/admin/usuarios');
    return { ok: true, message: 'Usuario guardado correctamente.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { ok: false, message: msg };
  }
}

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
