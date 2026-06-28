import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { TopNav } from '@/components/top-nav';
import Link from 'next/link';
import { CATEGORIES, getCategory, timeAgo, initials } from './categories';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ cat?: string }>;

export default async function ComunidadPage({ searchParams }: { searchParams: SearchParams }) {
  const { cat } = await searchParams;

  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role as string | undefined;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = userId ? (isAdmin || (await hasActiveSubscription(userId))) : false;

  const where = {
    status: { in: ['PUBLISHED', 'CLOSED'] as const },
    ...(cat ? { category: cat } : {}),
  };

  const [posts, pinnedPosts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        author: { select: { name: true, email: true, image: true } },
        _count: { select: { comments: true, reactions: true } },
        comments: { where: { isSolution: true, parentId: null }, select: { id: true }, take: 1 },
      },
    }),
    prisma.post.findMany({
      where: { pinned: true, status: 'PUBLISHED' },
      take: 3,
      select: { slug: true, title: true, category: true },
    }),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
  ]);

  const catKeys = Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[];

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)]">
        {/* HERO */}
        <div
          className="border-b border-[var(--color-border)]"
          style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.07) 0%, transparent 100%)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)', border: '1px solid rgba(249,115,22,0.3)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse inline-block" />
                  Comunidad
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Foro de <span style={{ color: 'var(--color-accent)' }}>Técnicos</span>
                </h1>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Guías, métodos y discusión técnica · {totalCount} publicaciones
                </p>
              </div>
              {hasSub ? (
                <Link
                  href="/comunidad/crear"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shrink-0"
                  style={{ background: 'var(--color-accent)' }}
                >
                  ✏️ Nueva publicación
                </Link>
              ) : (
                <Link
                  href="/planes"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-muted)] shrink-0"
                >
                  🔒 Suscríbete para publicar
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── MAIN FEED ── */}
            <div className="flex-1 min-w-0">
              {/* Category filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
                <Link
                  href="/comunidad"
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors shrink-0"
                  style={
                    !cat
                      ? { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' }
                      : { background: 'var(--color-card)', color: 'var(--color-muted)', borderColor: 'var(--color-border)' }
                  }
                >
                  Todos
                </Link>
                {catKeys.map((k) => {
                  const c = CATEGORIES[k];
                  const active = cat === k;
                  return (
                    <Link
                      key={k}
                      href={`/comunidad?cat=${k}`}
                      className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors shrink-0"
                      style={
                        active
                          ? { background: c.color, color: '#fff', borderColor: c.color }
                          : { background: c.bg, color: c.color, borderColor: c.border }
                      }
                    >
                      {c.emoji} {c.label}
                    </Link>
                  );
                })}
              </div>

              {/* Post list */}
              {posts.length === 0 ? (
                <div className="text-center py-16 text-[var(--color-muted)]">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="font-semibold">No hay publicaciones aún</p>
                  {hasSub && (
                    <Link href="/comunidad/crear" className="mt-3 inline-block text-sm" style={{ color: 'var(--color-accent)' }}>
                      ¡Sé el primero en publicar!
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {posts.map((post) => {
                    const cat = getCategory(post.category);
                    const isClosed = post.status === 'CLOSED';
                    const isResolved = post.comments.length > 0;
                    return (
                      <Link
                        key={post.id}
                        href={`/comunidad/${post.slug}`}
                        className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:border-[var(--color-accent)]/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          {post.author.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.author.image}
                              alt=""
                              className="w-9 h-9 rounded-full shrink-0 object-cover"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                            >
                              {initials(post.author.name, post.author.email)}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {post.pinned && (
                                <span className="text-[10px] font-bold text-[var(--color-accent)]">📌</span>
                              )}
                              {isClosed && (
                                <span className="text-[10px] font-semibold text-[var(--color-muted)]">🔒</span>
                              )}
                              {isResolved && (
                                <span className="text-[10px] font-bold" style={{ color: '#22c55e' }}>✅</span>
                              )}
                              <h2 className="text-sm font-bold leading-snug line-clamp-2">
                                {post.title}
                              </h2>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-[10px] font-bold rounded-full px-2 py-0.5"
                                style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                              >
                                {cat.emoji} {cat.label}
                              </span>
                              <span className="text-[11px] text-[var(--color-muted)]">
                                {post.author.name ?? post.author.email?.split('@')[0]} · {timeAgo(post.createdAt)}
                              </span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--color-muted)]">
                              <span>💬 {post._count.comments}</span>
                              <span>❤️ {post._count.reactions}</span>
                              <span>👁 {post.views}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <aside className="lg:w-72 lg:shrink-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
              {/* Pinned */}
              {pinnedPosts.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">
                    📌 Fijados
                  </p>
                  <div className="space-y-2">
                    {pinnedPosts.map((p) => {
                      const c = getCategory(p.category);
                      return (
                        <Link
                          key={p.slug}
                          href={`/comunidad/${p.slug}`}
                          className="flex items-start gap-2 group"
                        >
                          <span className="text-sm mt-0.5">{c.emoji}</span>
                          <span className="text-xs font-medium leading-snug group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                            {p.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">
                  🗂️ Categorías
                </p>
                <div className="space-y-1.5">
                  {catKeys.map((k) => {
                    const c = CATEGORIES[k];
                    return (
                      <Link
                        key={k}
                        href={`/comunidad?cat=${k}`}
                        className="flex items-center gap-2 text-sm py-1 rounded-lg px-2 hover:bg-[var(--color-bg)] transition-colors"
                        style={{ color: c.color }}
                      >
                        <span>{c.emoji}</span>
                        <span className="font-medium">{c.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              {!hasSub && (
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.06)' }}
                >
                  <p className="text-2xl mb-2">🔓</p>
                  <p className="text-sm font-bold mb-1">Únete a la comunidad</p>
                  <p className="text-xs text-[var(--color-muted)] mb-3">
                    Suscríbete para publicar y comentar
                  </p>
                  <Link
                    href="/planes"
                    className="inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-bold text-white w-full"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    Ver planes
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
