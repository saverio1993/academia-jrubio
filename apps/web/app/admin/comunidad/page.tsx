import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import Link from 'next/link';
import { getCategory, timeAgo } from '@/app/comunidad/categories';
import { pinPost, setPostStatus, deletePost } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminComunidadPage() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (role !== 'ADMIN' && role !== 'MODERATOR') redirect('/');

  const posts = await prisma.post.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      author: { select: { name: true, email: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  const totalComments = await prisma.postComment.count();
  const totalReactions = await prisma.postReaction.count();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Comunidad · Foro</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            {posts.length} publicaciones · {totalComments} comentarios · {totalReactions} reacciones
          </p>
        </div>
        <Link
          href="/comunidad"
          className="text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          Ver foro público →
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
              {['Título', 'Autor', 'Cat.', 'Estado', 'Comentarios', 'Vistas', 'Fecha', 'Acciones'].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] px-3 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const cat = getCategory(post.category);
              return (
                <tr
                  key={post.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-card)] transition-colors"
                >
                  <td className="px-3 py-3 max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      {post.pinned && <span className="text-[var(--color-accent)] text-xs">📌</span>}
                      <Link
                        href={`/comunidad/${post.slug}`}
                        className="font-medium line-clamp-2 leading-snug hover:text-[var(--color-accent)] transition-colors"
                      >
                        {post.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-muted)] whitespace-nowrap text-xs">
                    {post.author.name ?? post.author.email?.split('@')[0]}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap"
                      style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                    >
                      {cat.emoji} {cat.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                        post.status === 'PUBLISHED'
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                          : post.status === 'CLOSED'
                          ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-[var(--color-muted)]">{post._count.comments}</td>
                  <td className="px-3 py-3 text-center text-[var(--color-muted)]">{post.views}</td>
                  <td className="px-3 py-3 text-[var(--color-muted)] whitespace-nowrap text-xs">
                    {timeAgo(post.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Pin toggle */}
                      <form action={pinPost.bind(null, post.id, !post.pinned)}>
                        <button
                          title={post.pinned ? 'Desfijar' : 'Fijar'}
                          className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
                          style={post.pinned ? { color: 'var(--color-accent)' } : { color: 'var(--color-muted)' }}
                        >
                          📌
                        </button>
                      </form>

                      {/* Close/Open toggle */}
                      {post.status === 'CLOSED' ? (
                        <form action={setPostStatus.bind(null, post.id, 'PUBLISHED')}>
                          <button
                            title="Reabrir"
                            className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-green-500 transition-colors"
                          >
                            🔓
                          </button>
                        </form>
                      ) : (
                        <form action={setPostStatus.bind(null, post.id, 'CLOSED')}>
                          <button
                            title="Cerrar tema"
                            className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-yellow-500 transition-colors"
                          >
                            🔒
                          </button>
                        </form>
                      )}

                      {/* Delete */}
                      <form
                        action={deletePost.bind(null, post.id)}
                        onSubmit={(e) => {
                          if (!confirm(`¿Eliminar "${post.title}"? Esta acción es irreversible.`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <button
                          title="Eliminar"
                          className="text-xs px-2 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="text-center py-12 text-[var(--color-muted)]">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No hay publicaciones aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
