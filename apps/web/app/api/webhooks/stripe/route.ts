import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY      ?? '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET  ?? '';

// Verificación manual de firma Stripe (sin SDK)
async function verifyStripeSignature(body: string, header: string, secret: string): Promise<boolean> {
  const parts   = Object.fromEntries(header.split(',').map(p => p.split('='))) as Record<string, string>;
  const ts      = parts['t'];
  const sig     = parts['v1'];
  if (!ts || !sig) return false;

  const payload = `${ts}.${body}`;
  const key     = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const buf    = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === sig;
}

export async function POST(req: NextRequest) {
  const body   = await req.text();
  const sigHdr = req.headers.get('stripe-signature') ?? '';

  // Verificar firma si hay secreto configurado
  if (WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(body, sigHdr, WEBHOOK_SECRET);
    if (!valid) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      client_reference_id?: string;
      customer_email?: string;
      metadata?: Record<string, string>;
      payment_status?: string;
    };

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true });
    }

    const userId   = session.client_reference_id;
    const planSlug = session.metadata?.planSlug;

    if (!userId || !planSlug) {
      console.error('[stripe webhook] Faltan userId o planSlug', { userId, planSlug });
      return NextResponse.json({ received: true });
    }

    // Buscar plan
    const plan = await prisma.plan.findFirst({
      where: { slug: planSlug },
      select: { id: true, billingCycle: true },
    });
    if (!plan) {
      console.error('[stripe webhook] Plan no encontrado:', planSlug);
      return NextResponse.json({ received: true });
    }

    // Calcular expiración según ciclo
    const now       = new Date();
    const expiresAt = new Date(now);
    switch (plan.billingCycle) {
      case 'MONTHLY':    expiresAt.setMonth(expiresAt.getMonth() + 1);    break;
      case 'QUARTERLY':  expiresAt.setMonth(expiresAt.getMonth() + 3);    break;
      case 'YEARLY':     expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
      case 'LIFETIME':   expiresAt.setFullYear(expiresAt.getFullYear() + 99); break;
    }

    // Desactivar suscripciones anteriores
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data:  { status: 'EXPIRED' },
    });

    // Crear nueva suscripción
    await prisma.subscription.create({
      data: { userId, planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt },
    });

    // Registrar pago
    const amountMatch = (body as string).match(/"amount_total"\s*:\s*(\d+)/);
    const currency    = ((body as string).match(/"currency"\s*:\s*"([^"]+)"/) ?? [])[1] ?? 'usd';
    if (amountMatch?.[1]) {
      await prisma.payment.create({
        data: {
          userId,
          amountCents: parseInt(amountMatch[1]),
          currency:    currency.toUpperCase(),
          status:      'SUCCEEDED',
          provider:    'STRIPE',
        },
      }).catch(() => { /* no crítico */ });
    }

    console.log(`[stripe webhook] Suscripción creada para user=${userId} plan=${planSlug}`);
  }

  return NextResponse.json({ received: true });
}
