import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { PageHeader, Card } from '../_components/ui';

export const dynamic = 'force-dynamic';

function cents(n: number | null): string {
  if (!n) return '$0.00';
  return `$${(n / 100).toFixed(2)}`;
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default async function StatsPage() {
  await assertAdmin();

  const now     = new Date();
  const weekAgo = new Date(now.getTime() - 7  * 24 * 3600 * 1000);
  const monAgo  = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const in3d = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
  const in4d = new Date(now.getTime() + 4 * 24 * 3600 * 1000);

  const [
    totalUsers,
    activeSubs,
    totalFiles,
    totalDownloads,
    weekDownloads,
    monthDownloads,
    topFiles,
    byBrand,
    revenueAgg,
    pendingPayments,
    awaitingPayments,
    tgLinked,
    tgExpiringSoon,
    tgRecentSubs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.fileItem.count(),
    prisma.download.count(),
    prisma.download.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.download.count({ where: { createdAt: { gte: monAgo } } }),
    prisma.fileItem.findMany({
      orderBy: { downloadsCount: 'desc' },
      take: 10,
      select: { id: true, title: true, brand: true, model: true, category: true, downloadsCount: true, isPremium: true },
    }),
    prisma.fileItem.groupBy({
      by: ['brand'],
      _sum: { downloadsCount: true },
      orderBy: { _sum: { downloadsCount: 'desc' } },
      take: 12,
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amountCents: true },
    }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'AWAITING_APPROVAL' } }),
    // Bot Telegram stats
    prisma.user.count({ where: { telegramId: { not: null } } }),
    prisma.subscription.count({
      where: { status: 'ACTIVE', expiresAt: { gte: in3d, lt: in4d }, user: { telegramId: { not: null } } },
    }),
    prisma.subscription.findMany({
      where: { status: 'ACTIVE', expiresAt: { gte: in3d, lt: in4d } },
      include: { user: { select: { name: true, email: true, telegramId: true } }, plan: { select: { name: true } } },
      orderBy: { expiresAt: 'asc' },
      take: 10,
    }),
  ]);

  const totalRevenueCents = revenueAgg._sum.amountCents ?? 0;
  const maxBrandDownloads = Math.max(...byBrand.map((b) => b._sum.downloadsCount ?? 0), 1);
  const botConfigured = !!(process.env.TELEGRAM_BOT_TOKEN);

  return (
    <>
      <PageHeader
        title="Estadísticas"
        subtitle={`Actualizado: ${now.toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
      />

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Usuarios" value={totalUsers.toLocaleString()} icon="👥" color="blue" />
        <KpiCard label="Suscripciones activas" value={activeSubs.toLocaleString()} icon="⭐" color="orange" />
        <KpiCard label="Archivos en biblioteca" value={totalFiles.toLocaleString()} icon="📁" color="purple" />
        <KpiCard label="Ingresos totales" value={cents(totalRevenueCents)} icon="💰" color="green" />
      </div>

      {/* ── Descargas ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold">{totalDownloads.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Descargas totales</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold">{monthDownloads.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Últimos 30 días</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-3xl font-bold">{weekDownloads.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Últimos 7 días</p>
        </Card>
      </div>

      {/* ── Pagos pendientes ─────────────────────────────────────────────── */}
      {(pendingPayments + awaitingPayments) > 0 && (
        <Card className="mb-6 p-4 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-sm">Pagos que requieren atención</p>
            <p className="text-xs text-[var(--color-muted)]">
              {awaitingPayments} esperando aprobación · {pendingPayments} pendientes
            </p>
          </div>
          <a
            href="/admin/pagos"
            className="ml-auto rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
          >
            Ver pagos →
          </a>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Top 10 archivos ────────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span>🏆</span> Top 10 archivos más descargados
          </h2>
          <div className="space-y-3">
            {topFiles.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3">
                <span className={`shrink-0 w-6 text-center text-xs font-bold ${i < 3 ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    {f.isPremium && (
                      <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)]">PRO</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)]">{f.brand}{f.model ? ` · ${f.model}` : ''} · {f.category}</p>
                  {/* Mini barra de progreso */}
                  <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${pct(f.downloadsCount, topFiles[0]?.downloadsCount ?? 1)}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-[var(--color-accent)]">
                  {f.downloadsCount.toLocaleString()}
                </span>
              </div>
            ))}
            {topFiles.length === 0 && (
              <p className="text-sm text-[var(--color-muted)] text-center py-4">Sin descargas aún.</p>
            )}
          </div>
        </Card>

        {/* ── Descargas por marca ────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Descargas por marca
          </h2>
          <div className="space-y-3">
            {byBrand.map((b) => {
              const dl  = b._sum.downloadsCount ?? 0;
              const bar = pct(dl, maxBrandDownloads);
              return (
                <div key={b.brand} className="flex items-center gap-3">
                  <span className="shrink-0 w-24 text-xs text-[var(--color-muted)] truncate">{b.brand}</span>
                  <div className="flex-1 h-5 rounded-lg bg-white/5 overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${bar}%`,
                        background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-hover, #f97316))',
                        opacity: 0.7,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white">
                      {dl.toLocaleString()} descargas
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-muted)] w-8 text-right">{bar}%</span>
                </div>
              );
            })}
            {byBrand.length === 0 && (
              <p className="text-sm text-[var(--color-muted)] text-center py-4">Sin datos.</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Bot de Telegram ─────────────────────────────────────────────── */}
      <div className="mt-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <span>🤖</span> Bot de Telegram
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${botConfigured ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
            {botConfigured ? 'Activo' : 'Sin configurar'}
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <Card className="p-5 border border-blue-500/20 bg-blue-500/5">
            <p className="text-2xl font-bold text-blue-400">{tgLinked}</p>
            <p className="text-xs text-[var(--color-muted)] mt-1">Usuarios vinculados</p>
          </Card>
          <Card className="p-5 border border-orange-500/20 bg-orange-500/5">
            <p className="text-2xl font-bold text-orange-400">{tgExpiringSoon}</p>
            <p className="text-xs text-[var(--color-muted)] mt-1">Recordatorios hoy</p>
            <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Vencen en 3 días con Telegram</p>
          </Card>
          <Card className="p-5 border border-purple-500/20 bg-purple-500/5">
            <p className="text-2xl font-bold text-purple-400">{pct(tgLinked, totalUsers)}%</p>
            <p className="text-xs text-[var(--color-muted)] mt-1">De usuarios vinculados</p>
          </Card>
        </div>

        {tgRecentSubs.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Suscripciones que vencen en 3 días</h3>
            <div className="space-y-2">
              {tgRecentSubs.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <span className={`shrink-0 text-lg ${s.user.telegramId ? '✅' : '⚠️'}`}>
                    {s.user.telegramId ? '✅' : '⚠️'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.user.name ?? s.user.email}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">{s.plan.name}</p>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] shrink-0">
                    {s.expiresAt?.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })}
                  </p>
                  <span className="text-[10px] shrink-0" style={{ color: s.user.telegramId ? '#22c55e' : '#f59e0b' }}>
                    {s.user.telegramId ? 'Notificado' : 'Sin Telegram'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!botConfigured && (
          <Card className="p-4 border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3 mt-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-sm text-yellow-400">Bot no configurado</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Agrega <code className="bg-white/10 px-1 rounded">TELEGRAM_BOT_TOKEN</code> al archivo <code className="bg-white/10 px-1 rounded">.env</code> para activar los comandos del bot, las búsquedas inline y los recordatorios automáticos.
              </p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-500/10   border-blue-500/20   text-blue-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    green:  'bg-green-500/10  border-green-500/20  text-green-400',
  };
  return (
    <Card className={`p-5 border ${colors[color] ?? ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">{label}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Card>
  );
}
