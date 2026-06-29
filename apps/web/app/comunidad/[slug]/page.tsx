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
import { getLevel } from '@/lib/reputation';
import { SaveButton } from './save-button';
import { AskAIPanel } from './ask-ai-panel';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, content: true, category: true, author: { select: { name: true } } },
  });
  if (!post) return { title: 'Post no encontrado · Academia J Rubio' };

  const APP_URL = (process.env.APP_URL ?? 'https://academia-jrubio.vercel.app').replace(/\/$/, '');
  const cat = getCategory(post.category);
  // Strip markdown for description
  const description = post.content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*`>|[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  return {
    title: `${post.title} · ${cat.label} · Academia J Rubio`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `${APP_URL}/comunidad/${slug}`,
      siteName: 'Academia J Rubio',
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description,
    },
    other: {
      'telegram:channel': '@AcademiaJRubio',
    },
  };
}

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
      author: { select: { id: true, name: true, email: true, image: true, reputation: true } },
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

  incrementViews(slug).catch(() => {});

  // Fetch author stats, saved status, related posts in parallel
  const [authorPostsCount, authorSolutionsCount, savedRecord, relatedPosts] = await Promise.all([
    prisma.post.count({ where: { authorId: post.author.id, status: 'PUBLISHED' } }),
    prisma.postComment.count({ where: { authorId: post.author.id, isSolution: true } }),
    userId
      ? prisma.savedPost.findUnique({ where: { userId_postId: { userId, postId: post.id } }, select: { id: true } })
      : null,
    prisma.post.findMany({
      where: { category: post.category, status: 'PUBLISHED', id: { not: post.id } },
      orderBy: [{ pinned: 'desc' }, { views: 'desc' }],
      take: 3,
      select: {
        slug: true, title: true, createdAt: true,
        author: { select: { name: true, email: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);
  const isSaved = Boolean(savedRecord);

  const cat = getCategory(post.category);
  const isClosed = post.status === 'CLOSED';
  const canEdit = isAdmin || post.author.id === userId;
  const isResolved = post.comments.some(c => c.isSolution && !c.parentId);

  const reputationPoints = post.author.reputation ?? 0;
  const level = getLevel(reputationPoints);
  const authorName = post.author.name ?? post.author.email?.split('@')[0] ?? '?';

  const reactionCounts = post.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});
  const userReactions = userId
    ? post.reactions.filter((r) => r.userId === userId).map((r) => r.type)
    : [];

  const html = marked.parse(post.content) as string;

  const rootComments = post.comments.filter((c) => !c.parentId).map((c) => ({
    ...c,
    replies: post.comments.filter((r) => r.parentId === c.id).map((r) => ({ ...r, replies: [], isSolution: false })),
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
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden mb-6">

            {/* ── TOP: badges + title ── */}
            <div className="p-5 sm:p-6 border-b border-[var(--color-border)]">
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
                {isResolved && (
                  <span
                    className="text-[11px] font-bold rounded-full px-2.5 py-1"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    ✅ Resuelto
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug mb-3">
                {post.title}
              </h1>

              <PostActions slug={slug} title={post.title} canEdit={canEdit}>
                {userId && <SaveButton slug={slug} initialSaved={isSaved} />}
                <AskAIPanel postTitle={post.title} postContent={post.content} />
              </PostActions>
            </div>

            {/* ── BODY: author panel | content ── */}
            <div className="flex divide-x divide-[var(--color-border)]">

              {/* LEFT: Author panel (desktop only) */}
              <aside
                className="hidden sm:flex flex-col items-center gap-2 p-5 shrink-0 text-center"
                style={{ width: 168 }}
              >
                {/* Avatar */}
                {post.author.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author.image}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 2px ${level.color}60` }}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-base font-black"
                    style={{ background: `${level.color}20`, color: level.color, border: `2px solid ${level.color}40` }}
                  >
                    {initials(post.author.name, post.author.email)}
                  </div>
                )}

                {/* Name */}
                <p className="text-xs font-bold leading-tight max-w-full truncate px-1">
                  {authorName}
                </p>

                {/* Reputation badge */}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${level.color}18`, color: level.color, border: `1px solid ${level.color}35` }}
                >
                  {level.emoji} {level.label}
                </span>

                {/* Points */}
                <p className="text-[11px] font-semibold" style={{ color: level.color }}>
                  {reputationPoints} pts
                </p>

                <div className="w-full border-t border-[var(--color-border)] my-1" />

                {/* Stats */}
                <div className="flex flex-col gap-1 w-full text-left">
                  <p className="text-[10px] text-[var(--color-muted)]">
                    📝 <span className="font-semibold text-[var(--color-fg)]">{authorPostsCount}</span>{' '}
                    {authorPostsCount === 1 ? 'post' : 'posts'}
                  </p>
                  {authorSolutionsCount > 0 && (
                    <p className="text-[10px] text-[var(--color-muted)]">
                      ✅ <span className="font-semibold text-[var(--color-fg)]">{authorSolutionsCount}</span>{' '}
                      {authorSolutionsCount === 1 ? 'solución' : 'soluciones'}
                    </p>
                  )}
                </div>

                <div className="w-full border-t border-[var(--color-border)] my-1" />

                {/* Time + views */}
                <p className="text-[10px] text-[var(--color-muted)] leading-snug">
                  {timeAgo(post.createdAt)}
                </p>
                <p className="text-[10px] text-[var(--color-muted)]">
                  👁 {post.views} vistas
                </p>
              </aside>

              {/* RIGHT: Content + attachments + reactions */}
              <div className="flex-1 min-w-0">

                {/* Mobile: author bar */}
                <div className="flex sm:hidden items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
                  {post.author.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.image} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `${level.color}18`, color: level.color, border: `1px solid ${level.color}35` }}
                    >
                      {initials(post.author.name, post.author.email)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold">{authorName}</p>
                      <span
                        className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                        style={{ background: `${level.color}18`, color: level.color }}
                      >
                        {level.emoji} {level.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-muted)]">
                      {timeAgo(post.createdAt)} · {post.views} vistas
                    </p>
                  </div>
                </div>

                {/* Post content */}
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
                      {(() => {
                        const images = post.attachments.filter((a) => a.mimeType?.startsWith('image/'));
                        const files  = post.attachments.filter((a) => !a.mimeType?.startsWith('image/'));
                        return (
                          <>
                            {images.length > 0 && (
                              <div className={`grid gap-2 mb-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {images.map((img) => {
                                  const src = img.publicUrl.endsWith('/download')
                                    ? img.publicUrl
                                    : `${img.publicUrl}/download`;
                                  return (
                                    <a
                                      key={img.id}
                                      href={src}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors"
                                      style={images.length === 1 ? { maxHeight: 500 } : { aspectRatio: '1/1' }}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={src}
                                        alt={img.fileName}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </a>
                                  );
                                })}
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
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 sm:p-6">
            <CommentSection
              slug={slug}
              comments={rootComments}
              canComment={canComment && !isClosed}
              currentUserId={userId}
              isAdmin={isAdmin}
              postAuthorId={post.author.id}
            />
          </section>

          {isClosed && (
            <p className="text-center text-xs text-[var(--color-muted)] mt-4">
              🔒 Este tema está cerrado · No se aceptan nuevos comentarios
            </p>
          )}

          {/* Posts relacionados */}
          {relatedPosts.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">
                {cat.emoji} Más en {cat.label}
              </p>
              <div className="flex flex-col gap-2">
                {relatedPosts.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/comunidad/${r.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:border-[var(--color-accent)]/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug line-clamp-1">{r.title}</p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                        {r.author.name ?? r.author.email?.split('@')[0]} · {timeAgo(r.createdAt)} · 💬 {r._count.comments}
                      </p>
                    </div>
                    <span className="text-[var(--color-muted)] text-sm shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
