import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim();
  if (!code) return NextResponse.json({ valid: false, message: 'Código requerido.' });

  const coupon = await prisma.coupon.findFirst({
    where: { code, active: true },
    select: { code: true, type: true, value: true, description: true, maxUses: true, uses: true, expiresAt: true, stripeCouponId: true },
  });

  if (!coupon)                                              return NextResponse.json({ valid: false, message: 'Cupón inválido o no existe.' });
  if (!coupon.stripeCouponId)                              return NextResponse.json({ valid: false, message: 'Cupón no configurado correctamente.' });
  if (coupon.expiresAt && coupon.expiresAt < new Date())   return NextResponse.json({ valid: false, message: 'Este cupón ha expirado.' });
  if (coupon.maxUses && coupon.uses >= coupon.maxUses)     return NextResponse.json({ valid: false, message: 'Este cupón ya no tiene usos disponibles.' });

  const discountLabel = coupon.type === 'PERCENT'
    ? `${coupon.value}% de descuento`
    : `$${(coupon.value / 100).toFixed(2)} de descuento`;

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    description: coupon.description,
    discountLabel,
    message: `${discountLabel} aplicado en tu primer pago`,
  });
}
