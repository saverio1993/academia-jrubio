'use server';

import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

async function createStripeCoupon(
  type: string,
  stripeValue: number,
  name: string,
  duration: string,
): Promise<string> {
  const params = new URLSearchParams();
  params.set('name', name);
  params.set('duration', duration);

  if (type === 'PERCENT') {
    params.set('percent_off', String(stripeValue));
  } else {
    params.set('amount_off', String(stripeValue));
    params.set('currency', 'usd');
  }

  const res = await fetch('https://api.stripe.com/v1/coupons', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? 'Error al crear cupón en Stripe.');
  }

  const data = await res.json() as { id: string };
  return data.id;
}

export async function createCoupon(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  try {
    await assertAdmin();

    const code        = String(formData.get('code') ?? '').toUpperCase().trim();
    const description = String(formData.get('description') ?? '').trim() || null;
    const type        = String(formData.get('type') ?? 'PERCENT');
    const rawValue    = parseFloat(String(formData.get('value') ?? '0'));
    const maxUsesStr  = String(formData.get('maxUses') ?? '').trim();
    const maxUses     = maxUsesStr && parseInt(maxUsesStr) > 0 ? parseInt(maxUsesStr) : null;
    const expiryStr   = String(formData.get('expiresAt') ?? '').trim();
    const expiresAt   = expiryStr ? new Date(expiryStr) : null;
    const duration    = String(formData.get('duration') ?? 'once');

    if (!code || code.length < 3)      return { ok: false, message: 'El código debe tener al menos 3 caracteres.' };
    if (!/^[A-Z0-9_-]+$/.test(code))  return { ok: false, message: 'Solo letras mayúsculas, números, guiones y guiones bajos.' };
    if (!rawValue || rawValue <= 0)    return { ok: false, message: 'El valor debe ser mayor a 0.' };
    if (type === 'PERCENT' && rawValue > 100) return { ok: false, message: 'El porcentaje no puede superar 100.' };

    const existing = await prisma.coupon.findFirst({ where: { code } });
    if (existing) return { ok: false, message: `Ya existe un cupón con el código ${code}.` };

    // For PERCENT: stripeValue = rawValue (e.g. 50 for 50%)
    // For FIXED: rawValue is in USD dollars → convert to cents for Stripe
    const stripeValue  = type === 'PERCENT' ? rawValue : Math.round(rawValue * 100);
    // Store in DB: PERCENT → rawValue, FIXED → cents
    const storedValue  = type === 'PERCENT' ? rawValue : Math.round(rawValue * 100);

    const stripeName     = description ? `${code} – ${description}` : code;
    const stripeCouponId = await createStripeCoupon(type, stripeValue, stripeName, duration);

    await prisma.coupon.create({
      data: { code, description, type, value: storedValue, maxUses, expiresAt, stripeCouponId },
    });

    revalidatePath('/admin/cupones');
    return { ok: true, message: `Cupón ${code} creado correctamente.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error desconocido.' };
  }
}

export async function deactivateCoupon(id: string): Promise<void> {
  await assertAdmin();

  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { stripeCouponId: true } });

  if (coupon?.stripeCouponId) {
    await fetch(`https://api.stripe.com/v1/coupons/${coupon.stripeCouponId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    }).catch(() => {});
  }

  await prisma.coupon.update({ where: { id }, data: { active: false } });
  revalidatePath('/admin/cupones');
}
