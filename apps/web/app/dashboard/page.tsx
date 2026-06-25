import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { TopNav } from '@/components/top-nav';
import { ProfileNameEditor } from './profile-name-editor';
import { AIChat } from '@/app/archivos/ai-chat';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

function daysLeft(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function initials(name: string | null, email: string | null): string {
  const source = (name || email || '?').trim();
  const parts  = source.split(/[\s@]+/).filter(Boolean);
  if (!parts.length || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const userId = session.user.id;

  const [user, subscriptions, recentDownloads, totalDownloads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.download.findMany({
      where: { userId },
      include: { file: { select: { title: true, brand: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.download.count({ where: { userId } }),
  ]);

  const activeSub = subscriptions.find((s) => s.status === 'ACTIVE');
  const hasSub    = !!activeSub;
  const dl        = activeSub?.expiresAt ? daysLeft(activeSub.expiresAt) : null;

  // Aviso de vencimiento próximo
  if (activeSub?.expiresAt) {
    const remaining = daysLeft(activeSub.expiresAt);
    if (remaining <= 7 && remaining >= 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const alreadyNotified = await prisma.notification.findFirst({
        where: { userId, title: { startsWith: '⚠ Tu suscripción vence' }, createdAt: { gte: today } },
        select: { id: true },
      });
      if (!alreadyNotified) {
        const body = remaining === 0
          ? '⚠ Tu suscripción vence hoy. Renueva para no perder el acceso.'
          : `⚠ Tu suscripción vence en ${remaining} día${remaining !== 1 ? 's' : ''}.`;
        await prisma.notification.create({
          data: { userId, title: `⚠ Tu suscripción vence en ${remaining}d`, body },
        });
      }
    }
  }

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 pb-16">
        <div className="max-w-6xl mx-auto pt-8 space-y-5">

          {/* ── HERO BANNER ── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, var(--color-card) 55%)',
            }}
          >
            {/* orb decorativo */}
            <div
              className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)' }}
            />
            <div
              className="pointer-events-none absolute -bottom-20 right-8 w-56 h-56 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }}
            />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-8">
              {/* Saludo + avatar */}
              <div className="flex items-center gap-3 sm:gap-5">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt="avatar"
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover ring-4 ring-[var(--color-accent)]/30"
                  />
                ) : (
                  <div
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-base sm:text-xl font-black ring-4 ring-[var(--color-accent)]/20"
                    style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}
                  >
                    {initials(user?.name ?? null, user?.email ?? null)}
                  </div>
                )}
                <div>
                  <p className="text-sm text-[var(--color-muted)] mb-1">Bienvenido de vuelta 👋</p>
                  <ProfileNameEditor initialName={user?.name ?? user?.email ?? ''} />
                </div>
              </div>

              {/* Badge del plan */}
              {activeSub ? (
                <div
                  className="w-full sm:w-auto sm:shrink-0 rounded-2xl border px-6 py-4 text-center"
                  style={{
                    borderColor: 'rgba(249,115,22,0.4)',
                    background:  'rgba(249,115,22,0.08)',
                    boxShadow:   '0 0 32px rgba(249,115,22,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-muted)]">Plan activo</p>
                  <p className="text-3xl font-black text-[var(--color-accent)] mt-1 leading-none">{activeSub.plan.name}</p>
                  {dl !== null && (
                    <p className={`text-xs mt-2 font-medium ${dl <= 7 ? 'text-red-400' : 'text-[var(--color-muted)]'}`}>
                      {dl <= 0 ? 'Expirado' : `${dl} días restantes`}
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  href="/planes"
                  className="shrink-0 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                >
                  Activar plan →
                </Link>
              )}
            </div>
          </div>

          {/* ── STATS ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              {
                label: 'Plan',
                value: activeSub?.plan.name ?? '—',
                sub:   activeSub ? `ciclo ${activeSub.plan.billingCycle.toLowerCase()}` : 'sin suscripción',
                accent: true,
              },
              {
                label: 'Descargas',
                value: String(totalDownloads),
                sub:   'archivos descargados',
                accent: false,
              },
              {
                label: 'Vencimiento',
                value: activeSub?.expiresAt
                  ? new Date(activeSub.expiresAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })
                  : '—',
                sub:   dl !== null && dl <= 7 ? '⚠ Renueva pronto' : 'fecha de expiración',
                accent: false,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-3 sm:px-4 sm:py-4"
              >
                <p className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-tight sm:tracking-wider text-[var(--color-muted)] truncate">{s.label}</p>
                <p className={`text-sm sm:text-xl font-bold mt-0.5 sm:mt-1 leading-tight ${s.accent ? 'text-[var(--color-accent)]' : ''}`}>{s.value}</p>
                <p className="hidden sm:block text-[11px] text-[var(--color-muted)] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── ACCESO RÁPIDO ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                href:   '/archivos',
                emoji:  '📦',
                title:  'Archivos',
                desc:   'Firmware, drivers y herramientas',
                from:   'rgba(251,191,36,0.12)',
                to:     'transparent',
                border: 'rgba(251,191,36,0.25)',
                dot:    '#fbbf24',
              },
              {
                href:   '/academia',
                emoji:  '🎓',
                title:  'Cursos',
                desc:   'Academia y tutoriales',
                from:   'rgba(139,92,246,0.12)',
                to:     'transparent',
                border: 'rgba(139,92,246,0.25)',
                dot:    '#8b5cf6',
              },
              {
                href:   '/perfil',
                emoji:  '👤',
                title:  'Mi cuenta',
                desc:   'Perfil y suscripción',
                from:   'rgba(34,197,94,0.10)',
                to:     'transparent',
                border: 'rgba(34,197,94,0.22)',
                dot:    '#22c55e',
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 sm:gap-4 rounded-xl border px-4 py-3 sm:px-5 sm:py-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                style={{
                  background:   `linear-gradient(135deg, ${item.from}, ${item.to})`,
                  borderColor:  item.border,
                }}
              >
                {/* Dot de color */}
                <div
                  className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl sm:text-2xl"
                  style={{ background: `${item.dot}18`, border: `1px solid ${item.dot}30` }}
                >
                  {item.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{item.desc}</p>
                </div>
                <span className="ml-auto text-xl text-[var(--color-muted)] group-hover:text-[var(--color-fg)] group-hover:translate-x-0.5 transition-all">›</span>
              </Link>
            ))}
          </div>

          {/* ── MAIN GRID: IA + DESCARGAS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

            {/* Asistente IA */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-4 rounded-full bg-[var(--color-accent)]" />
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
                  Asistente IA — Busca y descarga
                </p>
              </div>
              <AIChat userId={userId} hasSub={hasSub} />
            </div>

            {/* Últimas descargas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
                  Últimas descargas
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
                {recentDownloads.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm text-[var(--color-muted)]">Aún no has descargado nada.</p>
                    <Link href="/archivos" className="inline-block mt-4 rounded-lg bg-[var(--color-accent)] text-white px-4 py-2 text-xs font-semibold">
                      Ir a la biblioteca
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-[var(--color-border)]/60">
                      {recentDownloads.map((d) => {
                        const icon = CAT_ICON[d.file.category] ?? '📄';
                        return (
                          <li
                            key={d.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                          >
                            <div
                              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/5"
                            >
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{d.file.title}</p>
                              <p className="text-[11px] text-[var(--color-muted)] truncate">
                                {d.file.brand} · {new Date(d.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="px-4 py-3 border-t border-[var(--color-border)]/60">
                      <Link
                        href="/mis-descargas"
                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                      >
                        Ver historial completo →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
