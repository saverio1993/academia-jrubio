import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME';
  features: unknown;
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function cycleLabel(c: Plan['billingCycle']) {
  switch (c) {
    case 'MONTHLY': return '/mes';
    case 'QUARTERLY': return '/trimestre';
    case 'YEARLY': return '/año';
    case 'LIFETIME': return 'pago único';
  }
}

async function createCheckout(planSlug: string, email?: string | null, userId?: string) {
  'use server';
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${apiUrl}/api/v1/checkout/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planSlug, email: email ?? undefined, userId }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Checkout falló: ${res.status}`);
  const data = (await res.json()) as { url: string };
  const { redirect } = await import('next/navigation');
  redirect(data.url);
}

export default async function PlanesPage() {
  const session = await auth();
  const logged = Boolean(session?.user);
  const plans = (await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })) as unknown as Plan[];

  return (
    <main className="landing">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />

      <nav>
        <div className="navin">
          <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="dot">JR</span> Academia <span style={{ color: 'var(--lp-accent)' }}>J Rubio</span>
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link className="btn btn-ghost" href={logged ? '/dashboard' : '/signin'}>
              {logged ? 'Mi cuenta' : 'Iniciar sesión'}
            </Link>
          </div>
        </div>
      </nav>

      <section className="wrap" style={{ paddingTop: 70 }}>
        <div className="stitle reveal in">
          <span className="eyebrow"><span className="pulse" /> Elige tu plan</span>
          <h2 style={{ fontSize: 'clamp(34px,5vw,52px)', fontWeight: 900 }}>
            Planes para <span className="grad">técnicos profesionales</span>
          </h2>
          <p>Acceso completo a la biblioteca y, según tu plan, comunidad privada de Telegram y soporte directo con el instructor. Cancela cuando quieras.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 20, alignItems: 'start' }}>
          {plans.map((plan) => {
            const pop = plan.slug === 'pro';
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
                <ul>
                  {features.map((f, idx) => (
                    <li key={idx}><span className="ck">✓</span> {f}</li>
                  ))}
                </ul>
                <form
                  action={async () => {
                    'use server';
                    await createCheckout(plan.slug, session?.user?.email, session?.user?.id);
                  }}
                >
                  <button type="submit" className={`btn ${pop ? 'btn-primary' : 'btn-ghost'}`}>
                    {logged ? 'Suscribirme' : 'Continuar al pago'}
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <div className="paybar reveal in">
          <p className="lbl">Pagos seguros con</p>
          <div className="brands">
            <span>Visa</span><span>Mastercard</span><span>PayPal</span><span>Binance Pay</span>
          </div>
          <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
            Sin compromiso. Cancela cuando quieras desde tu cuenta.
          </p>
          {!logged && (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/signin" style={{ color: '#fff', textDecoration: 'underline' }}>Inicia sesión</Link>
            </p>
          )}
        </div>
      </section>

      <div style={{ height: 40 }} />
    </main>
  );
}
