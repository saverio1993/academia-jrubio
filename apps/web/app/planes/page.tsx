import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { TopNav } from '@/components/top-nav';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyPendingReg } from '@/lib/pending-reg';
import { CouponInput } from './coupon-input';

export const dynamic = 'force-dynamic';

interface Plan {
  id: string; slug: string; name: string; description: string | null;
  priceCents: number; currency: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME';
  features: unknown;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
}
function cycleLabel(c: Plan['billingCycle']) {
  switch (c) {
    case 'MONTHLY':   return '/mes';
    case 'QUARTERLY': return '/trimestre';
    case 'YEARLY':    return '/año';
    case 'LIFETIME':  return 'pago único';
  }
}

async function createCheckout(
  planSlug: string,
  email?: string | null,
  userId?: string,
  pendingToken?: string,
  couponCode?: string,
) {
  'use server';
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug }, select: { stripePriceId: true } });
  if (!plan?.stripePriceId) throw new Error('Este plan aún no tiene precio configurado en Stripe.');

  const appUrl = process.env.APP_URL ?? 'https://academia-jrubio-web.vercel.app';
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', plan.stripePriceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${appUrl}/api/checkout/finalize?session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${appUrl}/planes`);
  params.set('metadata[planSlug]', planSlug);
  if (email)        params.set('customer_email', email);
  if (userId)       params.set('client_reference_id', userId);
  if (pendingToken) params.set('metadata[pendingReg]', pendingToken);

  // Apply coupon if provided (can't use allow_promotion_codes simultaneously)
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: couponCode, active: true },
      select: { stripeCouponId: true, maxUses: true, uses: true, expiresAt: true },
    });
    const isValid = coupon?.stripeCouponId &&
      (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
      (!coupon.maxUses || coupon.uses < coupon.maxUses);

    if (isValid) {
      params.set('discounts[0][coupon]', coupon!.stripeCouponId!);
      params.set('metadata[couponCode]', couponCode);
    } else {
      params.set('allow_promotion_codes', 'true');
    }
  } else {
    params.set('allow_promotion_codes', 'true');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Stripe: ${t.slice(0, 200)}`); }
  const data = (await res.json()) as { url: string };
  const { redirect: redir } = await import('next/navigation');
  redir(data.url);
}

export default async function PlanesPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  // Usuario ya logueado con suscripción activa → no necesita plan
  if (session?.user?.id) {
    const activeSub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      select: { id: true },
    });
    if (activeSub) redirect('/dashboard');
  }

  // Sin sesión → verificar que viene del flujo de registro (cookie)
  let pendingToken: string | undefined;
  if (!session?.user?.id) {
    const jar = await cookies();
    const raw = jar.get('_pending_reg')?.value;
    const pending = raw ? verifyPendingReg(raw) : null;
    if (!pending) redirect('/registro'); // No hay cookie válida → registrarse primero
    pendingToken = raw;
  }

  const plans = (await prisma.plan.findMany({
    where: { isActive: true, slug: { not: 'gratis' } },
    orderBy: { sortOrder: 'asc' },
  })) as unknown as Plan[];

  // Validate coupon from URL param
  const couponParam = sp?.coupon?.toUpperCase().trim();
  let appliedCoupon: { code: string; type: string; value: number; stripeCouponId: string } | null = null;
  let discountLabel = '';
  if (couponParam) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: couponParam, active: true },
      select: { code: true, type: true, value: true, stripeCouponId: true, maxUses: true, uses: true, expiresAt: true },
    });
    if (coupon?.stripeCouponId &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (!coupon.maxUses || coupon.uses < coupon.maxUses)) {
      appliedCoupon = { ...coupon, stripeCouponId: coupon.stripeCouponId };
      discountLabel = coupon.type === 'PERCENT'
        ? `${coupon.value}% de descuento`
        : `$${(coupon.value / 100).toFixed(2)} de descuento`;
    }
  }

  const loggedIn = Boolean(session?.user?.id);

  return (
    <main className="landing">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />

      {loggedIn ? <TopNav /> : (
        <nav style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dot">JR</span>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Academia <span style={{ color: 'var(--lp-accent)' }}>J Rubio</span></span>
          </Link>
        </nav>
      )}

      {/* Indicador de pasos — solo para flujo de registro */}
      {!loggedIn && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <div style={{ display: 'inline-flex', gap: 0, fontSize: 12 }}>
            <span style={{ padding: '4px 14px', borderRadius: '20px 0 0 20px', background: 'rgba(249,115,22,0.25)', color: '#fb923c', fontWeight: 600 }}>✓ Registro</span>
            <span style={{ padding: '4px 14px', background: '#f97316', color: '#fff', fontWeight: 700 }}>2 Elegir plan</span>
            <span style={{ padding: '4px 14px', borderRadius: '0 20px 20px 0', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>3 Pago</span>
          </div>
        </div>
      )}

      <section className="wrap" style={{ paddingTop: loggedIn ? 70 : 32 }}>
        <div className="stitle reveal in">
          <span className="eyebrow"><span className="pulse" /> Elige tu plan</span>
          <h2 style={{ fontSize: 'clamp(30px,5vw,48px)', fontWeight: 900 }}>
            ¿Qué acceso <span className="grad">necesitas?</span>
          </h2>
          <p>Acceso completo a la biblioteca y, según tu plan, comunidad privada de Telegram y soporte directo.</p>
        </div>

        {/* Cupón */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <CouponInput
            appliedCode={appliedCoupon?.code}
            discountLabel={discountLabel}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 20, alignItems: 'start' }}>
          {plans.map((plan) => {
            const pop      = plan.slug === 'pro';
            const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
            return (
              <div key={plan.id} className={`plan${pop ? ' pop' : ''}`}>
                {pop && <span className="badge">Más popular</span>}
                <div className="pn">{plan.name}</div>
                <div className="price">
                  {formatPrice(plan.priceCents, plan.currency)}
                  <span> {cycleLabel(plan.billingCycle)}</span>
                </div>
                {plan.description && <p className="pdesc">{plan.description}</p>}
                <ul>{features.map((f, i) => <li key={i}><span className="ck">✓</span> {f}</li>)}</ul>
                <form action={async () => {
                  'use server';
                  await createCheckout(
                    plan.slug,
                    session?.user?.email,
                    session?.user?.id,
                    pendingToken,
                    appliedCoupon?.code,
                  );
                }}>
                  <button type="submit" className={`btn ${pop ? 'btn-primary' : 'btn-ghost'}`}>
                    Suscribirme a {plan.name} →
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <div className="paybar reveal in">
          <p className="lbl">Pagos seguros con</p>
          <div className="brands"><span>Visa</span><span>Mastercard</span><span>PayPal</span><span>Binance Pay</span></div>
          <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>Sin compromiso. Cancela cuando quieras.</p>
        </div>
      </section>
      <div style={{ height: 40 }} />
    </main>
  );
}
