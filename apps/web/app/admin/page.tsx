import Link from 'next/link';
import { prisma } from '@academia/db';
import { money, dateTime } from '@/lib/format';
import { StatCard, Card, PageHeader, Badge } from './_components/ui';

export const dynamic = 'force-dynamic';

const PAYMENT_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  SUCCEEDED: 'green',
  FAILED: 'red',
  REJECTED: 'red',
  REFUNDED: 'gray',
  PENDING: 'yellow',
  AWAITING_APPROVAL: 'yellow',
};

export default async function AdminDashboard() {
  const [
    totalUsers,
    activeSubs,
    pendingPayments,
    totalFiles,
    totalDownloads,
    revenueAgg,
    recentUsers,
    recentPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.count({ where: { status: 'AWAITING_APPROVAL' } }),
    prisma.fileItem.count(),
    prisma.download.count(),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: 'SUCCEEDED' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const revenue = revenueAgg._sum.amountCents ?? 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen general de la plataforma" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Usuarios" value={totalUsers} />
        <StatCard label="Suscripciones activas" value={activeSubs} accent />
        <StatCard
          label="Pagos por aprobar"
          value={pendingPayments}
          hint={pendingPayments > 0 ? 'Requieren tu revisión' : 'Todo al día'}
        />
        <StatCard label="Ingresos (cobrados)" value={money(revenue)} />
        <StatCard label="Archivos" value={totalFiles} />
        <StatCard label="Descargas" value={totalDownloads} />
      </div>

      {pendingPayments > 0 && (
        <Link
          href="/admin/pagos?estado=AWAITING_APPROVAL"
          className="mt-6 flex items-center justify-between rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4 text-sm transition-colors hover:bg-yellow-500/10"
        >
          <span>
            Tienes <strong className="text-yellow-400">{pendingPayments}</strong> pago(s) manual(es)
            esperando aprobación.
          </span>
          <span className="text-yellow-400">Revisar →</span>
        </Link>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Usuarios recientes */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Usuarios recientes</h2>
            <Link href="/admin/usuarios" className="text-xs text-[var(--color-accent)] hover:underline">
              Ver todos
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Sin usuarios todavía.</p>
          ) : (
            <ul className="space-y-3">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name ?? u.email}</p>
                    <p className="truncate text-xs text-[var(--color-muted)]">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.role !== 'USER' && (
                      <Badge color={u.role === 'ADMIN' ? 'orange' : 'blue'}>{u.role}</Badge>
                    )}
                    <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                      {dateTime(u.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Pagos recientes */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Pagos recientes</h2>
            <Link href="/admin/pagos" className="text-xs text-[var(--color-accent)] hover:underline">
              Ver todos
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Sin pagos todavía.</p>
          ) : (
            <ul className="space-y-3">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {money(p.amountCents, p.currency)}{' '}
                      <span className="text-xs font-normal text-[var(--color-muted)]">
                        · {p.provider}
                      </span>
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {p.user.name ?? p.user.email}
                    </p>
                  </div>
                  <Badge color={PAYMENT_COLORS[p.status] ?? 'gray'}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
