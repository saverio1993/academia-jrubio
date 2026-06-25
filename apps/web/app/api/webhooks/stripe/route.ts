import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';
import { verifyPendingReg } from '@/lib/pending-reg';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY      ?? '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET  ?? '';

async function verifyStripeSignature(body: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('='))) as Record<string, string>;
  const ts    = parts['t'];
  const sig   = parts['v1'];
  if (!ts || !sig) return false;

  const payload  = `${ts}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const buf      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === sig;
}

function makeUsernameBase(email: string): string {
  return email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 28);
}

async function uniqueUsername(base: string): Promise<string> {
  let username = base;
  let n = 1;
  while (true) {
    const existing = await prisma.user.findFirst({ where: { username }, select: { id: true } });
    if (!existing) return username;
    username = `${base}${n++}`;
  }
}

async function computeExpiresAt(billingCycle: string): Promise<Date> {
  const d = new Date();
  switch (billingCycle) {
    case 'MONTHLY':   d.setMonth(d.getMonth() + 1);       break;
    case 'QUARTERLY': d.setMonth(d.getMonth() + 3);       break;
    case 'YEARLY':    d.setFullYear(d.getFullYear() + 1); break;
    case 'LIFETIME':  d.setFullYear(d.getFullYear() + 99);break;
  }
  return d;
}

export async function POST(req: NextRequest) {
  const body   = await req.text();
  const sigHdr = req.headers.get('stripe-signature') ?? '';

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

    const planSlug      = session.metadata?.planSlug;
    const pendingToken  = session.metadata?.pendingReg;
    let   userId        = session.client_reference_id;

    if (!planSlug) {
      console.error('[stripe webhook] Falta planSlug en metadata');
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

    // — Nuevo usuario desde registro con cookie —
    if (!userId && pendingToken) {
      const pending = verifyPendingReg(pendingToken);
      if (!pending) {
        console.error('[stripe webhook] Token pendingReg inválido o expirado');
        return NextResponse.json({ received: true });
      }

      // Verificar que el correo no haya sido creado ya (idempotencia)
      let user = await prisma.user.findUnique({ where: { email: pending.email }, select: { id: true } });
      if (!user) {
        const username = await uniqueUsername(makeUsernameBase(pending.email));
        user = await prisma.user.create({
          data: {
            name:         pending.name,
            email:        pending.email,
            passwordHash: pending.hash,
            username,
            emailVerified: new Date(), // se considera verificado porque pagó
          },
          select: { id: true },
        });
        console.log(`[stripe webhook] Usuario creado: ${pending.email}`);
      }

      userId = user.id;
    }

    if (!userId) {
      console.error('[stripe webhook] No hay userId ni pendingReg válido');
      return NextResponse.json({ received: true });
    }

    const now       = new Date();
    const expiresAt = await computeExpiresAt(plan.billingCycle);

    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data:  { status: 'EXPIRED' },
    });

    await prisma.subscription.create({
      data: { userId, planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt },
    });

    // Registrar pago (no crítico)
    const amountMatch = body.match(/"amount_total"\s*:\s*(\d+)/);
    const currency    = (body.match(/"currency"\s*:\s*"([^"]+)"/) ?? [])[1] ?? 'usd';
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

    console.log(`[stripe webhook] Suscripción creada user=${userId} plan=${planSlug}`);
  }

  return NextResponse.json({ received: true });
}
