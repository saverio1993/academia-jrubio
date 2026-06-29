import { prisma } from '@academia/db';
import { LiveViewer } from './live-viewer';
import { TopNav } from '@/components/top-nav';

export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const session = await prisma.liveSession.findFirst({
    where: { isLive: true },
    orderBy: { startedAt: 'desc' },
  });

  const recent = !session
    ? await prisma.liveSession.findMany({
        where: { isLive: false, endedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: 3,
        select: { title: true, startedAt: true, endedAt: true },
      })
    : [];

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)]">
        <div className="mx-auto max-w-5xl px-4 py-8">

          {session ? (
            <div>
              {/* Live badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
                      style={{ background: '#ef4444' }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  EN VIVO
                </span>
                <h1 className="text-lg font-bold truncate">{session.title}</h1>
              </div>

              {/* Player WebRTC */}
              <LiveViewer
                apiUrl={process.env.NEXT_PUBLIC_RENDER_UPLOAD_URL ?? 'https://academia-jrubio.onrender.com'}
              />

              {session.description && (
                <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>
                  {session.description}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📡</div>
              <h1 className="text-2xl font-bold mb-2">No hay live activo</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
                Cuando comience una transmisión en vivo aparecerá aquí automáticamente.
              </p>

              {recent.length > 0 && (
                <div className="mx-auto max-w-sm text-left">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3"
                     style={{ color: 'var(--color-muted)' }}>
                    Últimas transmisiones
                  </p>
                  <div className="space-y-2">
                    {recent.map((r, i) => (
                      <div key={i}
                           className="rounded-xl border px-4 py-3"
                           style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {r.startedAt.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
