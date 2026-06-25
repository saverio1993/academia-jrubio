import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { TopNav } from '@/components/top-nav';
import { ProfileNameEditor } from './profile-name-editor';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const userId = session.user.id;
  const [subscriptions, downloads, payments] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.download.findMany({
      where: { userId },
      include: { file: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const activeSub = subscriptions.find((s) => s.status === 'ACTIVE');

  // Aviso de vencimiento: notificar si expira en ≤7 días y no se ha notificado hoy
  if (activeSub?.expiresAt) {
    const daysLeft = Math.ceil((activeSub.expiresAt.getTime() - Date.now()) / 86400000);
    if (daysLeft <= 7 && daysLeft >= 0) {
      const today = new Date(); today.setHours(0,0,0,0);
      const alreadyNotified = await prisma.notification.findFirst({
        where: { userId, title: { startsWith: '⚠ Tu suscripción vence' }, createdAt: { gte: today } },
        select: { id: true },
      });
      if (!alreadyNotified) {
        const msg = daysLeft === 0
          ? '⚠ Tu suscripción vence hoy. Renueva para no perder el acceso.'
          : `⚠ Tu suscripción vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`;
        await prisma.notification.create({
          data: { userId, title: `⚠ Tu suscripción vence en ${daysLeft}d`, body: msg },
        });
      }
    }
  }

  return (
    <>
      <TopNav />
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <div className="mb-12">
          <p className="text-sm text-[var(--color-muted)] mb-1">Bienvenido</p>
          <ProfileNameEditor initialName={session.user.name ?? session.user.email ?? ''} />
        </div>

        <section className="mb-12">
          <h2 className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider mb-3">
            Suscripción
          </h2>
          {activeSub ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-2xl font-semibold">{activeSub.plan.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    ${(activeSub.plan.priceCents / 100).toFixed(2)} {activeSub.plan.currency} ·{' '}
                    {activeSub.plan.billingCycle.toLowerCase()}
                  </p>
                </div>
                {activeSub.expiresAt && (
                  <p className="text-xs text-[var(--color-muted)]">
                    Expira: {new Date(activeSub.expiresAt).toLocaleDateString('es-PA')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
              <p className="text-[var(--color-muted)] mb-4">No tienes una suscripción activa</p>
              <a
                href="/planes"
                className="inline-block rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 py-2 font-medium transition-colors"
              >
                Ver planes
              </a>
            </div>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider mb-3">
            Últimas descargas
          </h2>
          {downloads.length > 0 ? (
            <ul className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {downloads.map((d) => (
                <li key={d.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{d.file.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {d.file.brand} · {d.file.category}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    {new Date(d.createdAt).toLocaleString('es-PA')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Aún no has descargado nada.</p>
          )}
        </section>

        <section>
          <h2 className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider mb-3">
            Historial de pagos
          </h2>
          {payments.length > 0 ? (
            <ul className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {payments.map((p) => (
                <li key={p.id} className="px-6 py-4 flex items-center justify-between text-sm">
                  <span>${(p.amountCents / 100).toFixed(2)} {p.currency}</span>
                  <span className="text-[var(--color-muted)]">{p.provider}</span>
                  <span className={
                    p.status === 'SUCCEEDED' ? 'text-green-400' :
                    p.status === 'FAILED' || p.status === 'REJECTED' ? 'text-red-400' :
                    'text-[var(--color-muted)]'
                  }>
                    {p.status}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    {new Date(p.createdAt).toLocaleDateString('es-PA')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Sin pagos registrados.</p>
          )}
        </section>
      </main>
    </>
  );
}
