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
      // Proteger: no permitir que un admin se quite a sí mismo el rol ADMIN por error
      if (existing.id === admin.id && role !== 'ADMIN') {
        return { ok: false, message: 'No puedes cambiar tu propio rol de ADMIN desde aquí.' };
      }
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

export async function changeRole(formData: FormData): Promise<{ ok: boolean; text: string }> {
  try {
    const admin = await assertAdmin();
    const userId = String(formData.get('userId'));
    const role = String(formData.get('role')) as Role;
    if (!userId || !ROLES.includes(role)) return { ok: false, text: 'Datos inválidos' };

    if (userId === admin.id && role !== 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (admins <= 1) return { ok: false, text: 'No puedes quitarte el único rol ADMIN' };
    }

    await prisma.user.update({ where: { id: userId }, data: { role } });
    await logAudit(admin.id, 'user.role.changed', `user:${userId}`, { role });
    revalidatePath('/admin/usuarios');
    return { ok: true, text: 'Rol actualizado' };
  } catch {
    return { ok: false, text: 'Error al guardar' };
  }
}

export async function updateUserName(formData: FormData): Promise<{ ok: boolean; text: string }> {
  try {
    await assertAdmin();
    const userId = String(formData.get('userId'));
    const name   = String(formData.get('name') ?? '').trim();
    if (!userId) return { ok: false, text: 'Usuario inválido' };

    await prisma.user.update({ where: { id: userId }, data: { name: name || null } });
    revalidatePath('/admin/usuarios');
    return { ok: true, text: 'Nombre actualizado' };
  } catch {
    return { ok: false, text: 'Error al guardar' };
  }
}

export async function deleteUser(formData: FormData): Promise<{ ok: boolean; text: string }> {
  try {
    const admin  = await assertAdmin();
    const userId = String(formData.get('userId') ?? '').trim();
    if (!userId) return { ok: false, text: 'Usuario inválido' };

    if (userId === admin.id) return { ok: false, text: 'No puedes eliminarte a ti mismo.' };

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
    if (!target) return { ok: false, text: 'Usuario no encontrado.' };
    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) return { ok: false, text: 'No puedes eliminar el único admin.' };
    }

    await prisma.user.delete({ where: { id: userId } });
    await logAudit(admin.id, 'user.deleted', `user:${userId}`, { email: target.email });
    revalidatePath('/admin/usuarios');
    return { ok: true, text: 'Usuario eliminado.' };
  } catch {
    return { ok: false, text: 'Error al eliminar.' };
  }
}
