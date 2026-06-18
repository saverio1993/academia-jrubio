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
    case 'LIFETIME': return 'una vez';
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
  if (!res.ok) {
    throw new Error(`Checkout falló: ${res.status}`);
  }
  const data = (await res.json()) as { url: string };
  const { redirect } = await import('next/navigation');
  redirect(data.url);
}

export default async function PlanesPage() {
  const session = await auth();
  const plans = (await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })) as unknown as Plan[];

  return (
    <main className="min-h-screen px-6 py-20 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
          Elige tu plan
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Planes para <span className="text-[var(--color-accent)]">técnicos profesionales</span>
        </h1>
        <p className="text-lg text-[var(--color-muted)] max-w-2xl mx-auto">
          Acceso completo a la biblioteca, comunidad privada de Telegram y soporte directo.
          Cancela cuando quieras.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => {
          const isHighlighted = plan.slug === 'premium';
          const features = Array.isArray(plan.features) ? plan.features as string[] : [];

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                isHighlighted
                  ? 'border-[var(--color-accent)] bg-[var(--color-card)] shadow-2xl shadow-orange-500/10'
                  : 'border-[var(--color-border)] bg-[var(--color-card)]'
              } p-8 flex flex-col`}
            >
              {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white text-xs font-medium px-3 py-1 rounded-full">
                  Más popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-[var(--color-muted)] min-h-[40px]">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(plan.priceCents, plan.currency)}</span>
                  <span className="text-sm text-[var(--color-muted)]">{cycleLabel(plan.billingCycle)}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <form
                action={async () => {
                  'use server';
                  await createCheckout(plan.slug, session?.user?.email, session?.user?.id);
                }}
              >
                <button
                  type="submit"
                  className={`w-full rounded-lg px-5 py-3 font-medium transition-colors ${
                    isHighlighted
                      ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white'
                      : 'border border-[var(--color-border)] hover:bg-white/5'
                  }`}
                >
                  {session?.user ? 'Suscribirme' : 'Continuar al pago'}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* Trust strip */}
      <div className="mt-16 text-center space-y-3">
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
          Pagos seguros con
        </p>
        <div className="flex items-center justify-center gap-6 text-[var(--color-muted)]">
          <span className="font-semibold">Visa</span>
          <span className="font-semibold">Mastercard</span>
          <span className="font-semibold">PayPal</span>
          <span className="font-semibold">Binance Pay</span>
        </div>
        <p className="text-xs text-[var(--color-muted)] pt-4">
          Sin compromiso. Cancela cuando quieras desde tu cuenta.
          ¿Tienes dudas?{' '}
          <Link href="/contacto" className="underline">
            Habla con nosotros
          </Link>
          .
        </p>
      </div>

      {!session?.user && (
        <p className="text-center text-sm text-[var(--color-muted)] mt-8">
          ¿Ya tienes cuenta?{' '}
          <Link href="/signin" className="text-[var(--color-fg)] underline">
            Inicia sesión
          </Link>
        </p>
      )}
    </main>
  );
}
