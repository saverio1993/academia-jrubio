import { prisma } from '@academia/db';
import { getLevel } from '@/lib/reputation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  frp:          { label: 'FRP',         icon: '🔓' },
  imei:         { label: 'IMEI',        icon: '📡' },
  flash:        { label: 'Flash',       icon: '💾' },
  unlock:       { label: 'Unlock',      icon: '🔑' },
  herramientas: { label: 'Herramientas',icon: '🛠️' },
  general:      { label: 'General',     icon: '💬' },
};

function timeAgo(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

export default async function TgComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;

  const where = {
    status: { in: ['PUBLISHED', 'CLOSED'] as ('PUBLISHED' | 'CLOSED')[] },
    ...(cat ? { category: cat } : {}),
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 40,
    include: {
      author: { select: { name: true, image: true, reputation: true } },
      _count: { select: { comments: true, reactions: true } },
      comments: { where: { isSolution: true, parentId: null }, select: { id: true }, take: 1 },
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b border-[var(--color-border)] p-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold">💬 Foro</h1>
          <Link
            href="/comunidad/crear"
            className="rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            + Nuevo
          </Link>
        </div>
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <a
            href="/tg/comunidad"
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${
              !cat
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >
            Todos
          </a>
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <a
              key={key}
              href={`/tg/comunidad?cat=${key}`}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${
                cat === key
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'
              }`}
            >
              {val.icon} {val.label}
            </a>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 p-4 space-y-2">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">No hay posts en esta categoría</p>
          </div>
        ) : (
          posts.map((post) => {
            const level = getLevel(post.author.reputation);
            const catInfo = CATEGORIES[post.category];
            const resolved = post.comments.length > 0;
            return (
              <Link
                key={post.id}
                href={`/comunidad/${post.slug}`}
                className="block rounded-xl border border-[var(--color-border)] p-4"
                style={{ background: 'var(--color-card)' }}
              >
                <div className="flex items-start gap-3">
                  {/* Author avatar */}
                  <div className="shrink-0">
                    {post.author.image ? (
                      <img src={post.author.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `${level.color}20`, color: level.color }}
                      >
                        {(post.author.name ?? '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {post.pinned && (
                        <span className="text-[10px] font-bold text-amber-400">📌</span>
                      )}
                      {catInfo && (
                        <span
                          className="text-[10px] font-bold rounded-full px-2 py-0.5"
                          style={{ background: 'rgba(249,115,22,0.12)', color: 'var(--color-accent)' }}
                        >
                          {catInfo.icon} {catInfo.label}
                        </span>
                      )}
                      {resolved && (
                        <span
                          className="text-[10px] font-bold rounded-full px-2 py-0.5"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
                        >
                          ✅ Resuelto
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--color-muted)' }}>
                      <span>{post.author.name ?? 'Usuario'}</span>
                      <span>{post._count.comments} respuestas</span>
                      <span>{post._count.reactions} 👍</span>
                      <span className="ml-auto">{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
