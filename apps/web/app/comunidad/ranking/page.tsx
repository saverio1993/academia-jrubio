import { prisma } from '@academia/db';
import { TopNav } from '@/components/top-nav';
import Link from 'next/link';
import { getLevel } from '@/lib/reputation';
import { initials } from '../categories';

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const [topUsers, totalPosts, totalSolutions] = await Promise.all([
    prisma.user.findMany({
      where: { reputation: { gt: 0 } },
      orderBy: { reputation: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        reputation: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
    prisma.postComment.count({ where: { isSolution: true } }),
  ]);

  // Get solution counts per user
  const solutionCounts = await prisma.postComment.groupBy({
    by: ['authorId'],
    where: { isSolution: true },
    _count: { id: true },
  });
  const solutionMap = Object.fromEntries(solutionCounts.map((s) => [s.authorId, s._count.id]));

  const podium = topUsers.slice(0, 3);
  const rest   = topUsers.slice(3);

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">

        {/* Hero */}
        <div
          className="border-b border-[var(--color-border)]"
          style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.07) 0%, transparent 100%)' }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Link
              href="/comunidad"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors mb-4"
            >
              ← Volver al foro
            </Link>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)', border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  🏆 Ranking
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Mejores <span style={{ color: 'var(--color-accent)' }}>Técnicos</span>
                </h1>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  {totalPosts} publicaciones · {totalSolutions} soluciones en la comunidad
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {topUsers.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-muted)]">
              <p className="text-4xl mb-3">🌱</p>
              <p className="font-semibold">Aún no hay técnicos con reputación</p>
              <p className="text-sm mt-1">Publica en el foro para ganar puntos</p>
            </div>
          ) : (
            <>
              {/* Podium top 3 */}
              {podium.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {[podium[1], podium[0], podium[2]].map((user, visualIdx) => {
                    if (!user) return <div key={visualIdx} />;
                    const rank = user === podium[0] ? 0 : user === podium[1] ? 1 : 2;
                    const level = getLevel(user.reputation);
                    const sols = solutionMap[user.id] ?? 0;
                    const isCenter = visualIdx === 1; // 1st place in center
                    return (
                      <div
                        key={user.id}
                        className={`flex flex-col items-center rounded-2xl border p-4 text-center ${isCenter ? 'ring-1' : ''}`}
                        style={{
                          background: isCenter
                            ? 'linear-gradient(160deg, rgba(249,115,22,0.1) 0%, var(--color-card) 60%)'
                            : 'var(--color-card)',
                          borderColor: isCenter ? 'rgba(249,115,22,0.4)' : 'var(--color-border)',
                          ...(isCenter ? { outline: '1px solid rgba(249,115,22,0.15)', outlineOffset: 2 } : {}),
                          marginTop: isCenter ? 0 : 16,
                        }}
                      >
                        <span className="text-2xl mb-2">{MEDAL[rank]}</span>
                        {user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.image}
                            alt=""
                            className={`rounded-full object-cover mb-2 ${isCenter ? 'w-16 h-16' : 'w-12 h-12'}`}
                            style={{ boxShadow: `0 0 0 2px ${level.color}50` }}
                          />
                        ) : (
                          <div
                            className={`rounded-full flex items-center justify-center font-black mb-2 ${isCenter ? 'w-16 h-16 text-lg' : 'w-12 h-12 text-sm'}`}
                            style={{ background: `${level.color}20`, color: level.color, border: `2px solid ${level.color}40` }}
                          >
                            {initials(user.name, user.email)}
                          </div>
                        )}
                        <p className={`font-bold leading-tight truncate max-w-full px-1 ${isCenter ? 'text-sm' : 'text-xs'}`}>
                          {user.name ?? user.email?.split('@')[0]}
                        </p>
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold mt-1"
                          style={{ background: `${level.color}18`, color: level.color }}
                        >
                          {level.emoji} {level.label}
                        </span>
                        <p className={`font-black mt-2 ${isCenter ? 'text-xl' : 'text-base'}`} style={{ color: 'var(--color-accent)' }}>
                          {user.reputation}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)]">puntos</p>
                        <div className="flex gap-3 mt-2 text-[10px] text-[var(--color-muted)]">
                          <span>📝 {user._count.posts}</span>
                          {sols > 0 && <span>✅ {sols}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rest of the list */}
              {rest.length > 0 && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
                  {rest.map((user, i) => {
                    const rank = i + 4;
                    const level = getLevel(user.reputation);
                    const sols = solutionMap[user.id] ?? 0;
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
                      >
                        {/* Rank number */}
                        <span className="text-sm font-black text-[var(--color-muted)] w-6 text-center shrink-0">
                          {rank}
                        </span>

                        {/* Avatar */}
                        {user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.image}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${level.color}18`, color: level.color, border: `1px solid ${level.color}35` }}
                          >
                            {initials(user.name, user.email)}
                          </div>
                        )}

                        {/* Name + badge */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {user.name ?? user.email?.split('@')[0]}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                              style={{ background: `${level.color}15`, color: level.color }}
                            >
                              {level.emoji} {level.label}
                            </span>
                            <span className="text-[10px] text-[var(--color-muted)]">
                              📝 {user._count.posts}
                              {sols > 0 && ` · ✅ ${sols}`}
                            </span>
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black" style={{ color: level.color }}>
                            {user.reputation}
                          </p>
                          <p className="text-[10px] text-[var(--color-muted)]">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Points legend */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">
                  ⚡ Cómo ganar puntos
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Publicar post', pts: '+10', emoji: '📝' },
                    { label: 'Reacción recibida', pts: '+3', emoji: '❤️' },
                    { label: 'Respuesta solución', pts: '+25', emoji: '✅' },
                    { label: 'Post fijado', pts: '+15', emoji: '📌' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col items-center text-center rounded-xl p-3"
                      style={{ background: 'var(--color-bg)' }}
                    >
                      <span className="text-xl mb-1">{item.emoji}</span>
                      <span className="text-base font-black" style={{ color: 'var(--color-accent)' }}>
                        {item.pts}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)] mt-0.5 leading-tight">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
