import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@academia/db';
import { verifyPendingReg } from '@/lib/pending-reg';

export const dynamic = 'force-dynamic';

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

async function createSubscription(userId: string, planSlug: string) {
  const plan = await prisma.plan.findFirst({
    where: { slug: planSlug },
    select: { id: true, billingCycle: true },
  });
  if (!plan) return;

  const now       = new Date();
  const expiresAt = new Date(now);
  switch (plan.billingCycle) {
    case 'MONTHLY':   expiresAt.setMonth(expiresAt.getMonth() + 1);       break;
    case 'QUARTERLY': expiresAt.setMonth(expiresAt.getMonth() + 3);       break;
    case 'YEARLY':    expiresAt.setFullYear(expiresAt.getFullYear() + 1); break;
    case 'LIFETIME':  expiresAt.setFullYear(expiresAt.getFullYear() + 99);break;
  }

  await prisma.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data:  { status: 'EXPIRED' },
  });
  await prisma.subscription.create({
    data: { userId, planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt },
  });
}

export async function GET(req: NextRequest) {
  const base      = new URL(req.url).origin;
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(`${base}/planes`);
  }

  // Verificar el pago con Stripe
  const stripeRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      cache: 'no-store',
    },
  );

  if (!stripeRes.ok) {
    console.error('[finalize] Error consultando Stripe:', await stripeRes.text());
    return NextResponse.redirect(`${base}/checkout/success?error=1`);
  }

  const stripe = await stripeRes.json() as {
    payment_status:     string;
    client_reference_id?: string;
    customer_email?:    string;
    metadata?:          Record<string, string>;
    amount_total?:      number;
    currency?:          string;
  };

  if (stripe.payment_status !== 'paid') {
    return NextResponse.redirect(`${base}/checkout/success?unpaid=1`);
  }

  const planSlug = stripe.metadata?.planSlug ?? '';

  // ── Caso 1: usuario existente (ya tenía sesión al comprar) ──
  const existingUserId = stripe.client_reference_id;
  if (existingUserId) {
    await createSubscription(existingUserId, planSlug);
    // Registrar pago (no crítico)
    if (stripe.amount_total) {
      await prisma.payment.create({
        data: {
          userId:      existingUserId,
          amountCents: stripe.amount_total,
          currency:    (stripe.currency ?? 'usd').toUpperCase(),
          status:      'SUCCEEDED',
          provider:    'STRIPE',
        },
      }).catch(() => {});
    }
    return NextResponse.redirect(`${base}/checkout/success?paid=1`);
  }

  // ── Caso 2: registro nuevo — leer cookie pendiente ──
  const rawReg  = req.cookies.get('_pending_reg')?.value;
  const pending = rawReg ? verifyPendingReg(rawReg) : null;

  if (!pending) {
    // No hay cookie válida — puede que ya existe la cuenta (idempotencia)
    // Redirigir a signin
    return NextResponse.redirect(`${base}/signin?welcome=1`);
  }

  // Crear usuario si no existe aún (idempotencia)
  let user = await prisma.user.findUnique({
    where: { email: pending.email },
    select: { id: true },
  });

  if (!user) {
    const username = await uniqueUsername(makeUsernameBase(pending.email));
    user = await prisma.user.create({
      data: {
        name:          pending.name,
        email:         pending.email,
        passwordHash:  pending.hash,
        username,
        emailVerified: new Date(),
      },
      select: { id: true },
    });
    console.log(`[finalize] Usuario creado: ${pending.email}`);
  }

  await createSubscription(user.id, planSlug);

  if (stripe.amount_total) {
    await prisma.payment.create({
      data: {
        userId:      user.id,
        amountCents: stripe.amount_total,
        currency:    (stripe.currency ?? 'usd').toUpperCase(),
        status:      'SUCCEEDED',
        provider:    'STRIPE',
      },
    }).catch(() => {});
  }

  // Crear sesión NextAuth en la base de datos y enviar la cookie
  const sessionToken = randomBytes(32).toString('hex');
  const expires      = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  // NextAuth v5 usa __Secure- prefix en producción (HTTPS)
  const secure     = process.env.NODE_ENV === 'production';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';

  const response = NextResponse.redirect(`${base}/dashboard`);

  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    expires,
    path: '/',
  });
  response.cookies.delete('_pending_reg');

  return response;
}
