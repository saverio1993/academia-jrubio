import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { redirect } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import Link from 'next/link';
import { getCategory, timeAgo, initials } from '../categories';
import { getLevel } from '@/lib/reputation';

export const dynamic = 'force-dynamic';

export default async function GuardadosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/comunidad/guardados');

  const saved = await prisma.savedPost.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          author: { select: { name: true, email: true, image: true, reputation: true } },
          _count: { select: { comments: true, reactions: true } },
          comments: { where: { isSolution: true, parentId: null }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  const posts = saved.map((s) => s.post);

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          <Link
            href="/comunidad"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors mb-5"
          >
            ← Volver al foro
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight">
              🔖 Posts <span style={{ color: 'var(--color-accent)' }}>guardados</span>
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {posts.length} {posts.length === 1 ? 'publicación guardada' : 'publicaciones guardadas'}
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-muted)]">
              <p className="text-4xl mb-3">🔖</p>
              <p className="font-semibold">No tienes posts guardados</p>
              <p className="text-sm mt-1">Pulsa el botón "Guardar" en cualquier post para añadirlo aquí</p>
              <Link
                href="/comunidad"
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                Explorar el foro
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((post) => {
                const cat = getCategory(post.category);
                const isClosed = post.status === 'CLOSED';
                const isResolved = post.comments.length > 0;
                const level = getLevel(post.author.reputation ?? 0);
                return (
                  <Link
                    key={post.id}
                    href={`/comunidad/${post.slug}`}
                    className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:border-[var(--color-accent)]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {post.author.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.author.image} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${level.color}18`, color: level.color, border: `1px solid ${level.color}35` }}
                        >
                          {initials(post.author.name, post.author.email)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {post.pinned && <span className="text-[10px] font-bold text-[var(--color-accent)]">📌</span>}
                          {isClosed && <span className="text-[10px] text-[var(--color-muted)]">🔒</span>}
                          {isResolved && <span className="text-[10px] font-bold" style={{ color: '#22c55e' }}>✅</span>}
                          <h2 className="text-sm font-bold leading-snug line-clamp-2">{post.title}</h2>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold rounded-full px-2 py-0.5"
                            style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                          >
                            {cat.emoji} {cat.label}
                          </span>
                          <span className="text-[11px] text-[var(--color-muted)]">
                            {post.author.name ?? post.author.email?.split('@')[0]}
                          </span>
                          <span
                            className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                            style={{ background: `${level.color}15`, color: level.color }}
                          >
                            {level.emoji} {level.label}
                          </span>
                          <span className="text-[11px] text-[var(--color-muted)]">· {timeAgo(post.createdAt)}</span>
                        </div>
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
      </main>
    </>
  );
}
