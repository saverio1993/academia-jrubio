import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import Link from 'next/link';
import { marked } from 'marked';
import { getCategory, timeAgo, initials } from '../categories';
import { CommentSection } from './comment-section';
import { ReactionBar } from './reaction-bar';
import { PostActions } from './post-actions';
import { incrementViews } from './actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role as string | undefined;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = userId ? (isAdmin || (await hasActiveSubscription(userId))) : false;
  const canComment = hasSub && Boolean(userId);

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
      reactions: { select: { type: true, userId: true } },
      attachments: { orderBy: { createdAt: 'asc' } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, name: true, email: true, image: true } } },
          },
        },
      },
    },
  });

  if (!post || post.status === 'DRAFT') notFound();

  // Increment view count (fire-and-forget)
  incrementViews(slug).catch(() => {});

  const cat = getCategory(post.category);
  const isClosed = post.status === 'CLOSED';

  const canEdit = isAdmin || post.author.id === userId;

  const reactionCounts = post.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const userReactions = userId ? post.reactions.filter((r) => r.userId === userId).map((r) => r.type) : [];

  const html = await marked.parse(post.content);

  // Build comment tree (only 1 level deep)
  const rootComments = post.comments.filter((c) => !c.parentId).map((c) => ({
    ...c,
    replies: post.comments.filter((r) => r.parentId === c.id).map((r) => ({ ...r, replies: [] })),
  }));

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* Back */}
          <Link
            href="/comunidad"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors mb-5"
          >
            ← Volver al foro
          </Link>

          {/* Post card */}
          <article
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden mb-6"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[var(--color-border)]">
              {/* Category + status badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span
                  className="text-[11px] font-bold rounded-full px-2.5 py-1"
                  style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                >
                  {cat.emoji} {cat.label}
                </span>
                {post.pinned && (
                  <span
                    className="text-[11px] font-bold rounded-full px-2.5 py-1"
                    style={{ background: 'rgba(249,115,22,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(249,115,22,0.3)' }}
                  >
                    📌 Fijado
                  </span>
                )}
                {isClosed && (
                  <span
                    className="text-[11px] font-bold rounded-full px-2.5 py-1"
                    style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)' }}
                  >
                    🔒 Cerrado
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug mb-4">
                {post.title}
              </h1>

              {/* Author row */}
              <div className="flex items-center gap-3">
                {post.author.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.author.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                  >
                    {initials(post.author.name, post.author.email)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold">
                    {post.author.name ?? post.author.email?.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    {timeAgo(post.createdAt)} · {post.views} vistas
                  </p>
                </div>
              </div>

              <PostActions slug={slug} title={post.title} canEdit={canEdit} />
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6">
              <div
                className="post-content text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            {/* Attachments */}
            {post.attachments.length > 0 && (
              <div className="px-5 sm:px-6 pb-2">
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">
                    📎 Adjuntos ({post.attachments.length})
                  </p>

                  {/* Image grid */}
                  {(() => {
                    const images = post.attachments.filter((a) => a.mimeType?.startsWith('image/'));
                    const files  = post.attachments.filter((a) => !a.mimeType?.startsWith('image/'));
                    return (
                      <>
                        {images.length > 0 && (
                          <div className={`grid gap-2 mb-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {images.map((img) => (
                              <a
                                key={img.id}
                                href={img.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors"
                                style={images.length === 1 ? { maxHeight: 400 } : { aspectRatio: '1/1' }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.publicUrl}
                                  alt={img.fileName}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        {files.length > 0 && (
                          <div className="space-y-2">
                            {files.map((f) => {
                              const isPdf = f.mimeType === 'application/pdf';
                              const sizeStr = f.sizeBytes
                                ? Number(f.sizeBytes) < 1024 * 1024
                                  ? `${(Number(f.sizeBytes) / 1024).toFixed(1)} KB`
                                  : `${(Number(f.sizeBytes) / (1024 * 1024)).toFixed(1)} MB`
                                : '';
                              return (
                                <a
                                  key={f.id}
                                  href={`${f.publicUrl}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 hover:border-[var(--color-accent)]/40 transition-colors"
                                >
                                  <span className="text-2xl shrink-0">{isPdf ? '📄' : '🗜️'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{f.fileName}</p>
                                    {sizeStr && <p className="text-[11px] text-[var(--color-muted)]">{sizeStr}</p>}
                                  </div>
                                  <span className="text-xs text-[var(--color-accent)] font-semibold shrink-0">⬇ Descargar</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Reactions */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
              <div className="pt-4 border-t border-[var(--color-border)]">
                <ReactionBar
                  slug={slug}
                  counts={reactionCounts}
                  userReactions={userReactions}
                  canReact={canComment}
                />
              </div>
            </div>
          </article>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Admin:</p>
              <a
                href={`/admin/comunidad?postId=${post.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                ⚙️ Gestionar en admin
              </a>
            </div>
          )}

          {/* Comments */}
          <section
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6"
          >
            <CommentSection
              slug={slug}
              comments={rootComments}
              canComment={canComment && !isClosed}
              currentUserId={userId}
              isAdmin={isAdmin}
            />
          </section>

          {isClosed && (
            <p className="text-center text-xs text-[var(--color-muted)] mt-4">
              🔒 Este tema está cerrado · No se aceptan nuevos comentarios
            </p>
          )}
        </div>
      </main>
    </>
  );
}
