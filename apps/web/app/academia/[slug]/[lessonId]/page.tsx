import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { auth } from '@/auth';
import { hasActiveSubscription, canAccessCourse } from '@/lib/access';
import { toEmbedUrl } from '@/lib/video';
import { dateTime } from '@/lib/format';
import { toggleLessonComplete, postComment, deleteComment } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function LessonPlayer({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { lessons: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!course || !course.isPublished) notFound();

  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
  const lesson = course.lessons[lessonIndex];
  if (!lesson) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/academia/${slug}/${lessonId}`);
  const userId = session.user.id;

  const hasSub = await hasActiveSubscription(userId);
  const access = canAccessCourse(course.isPremium, hasSub);
  const unlocked = access || lesson.isFreePreview;

  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { courseId: course.id } },
    select: { lessonId: true },
  });
  const completedIds = new Set(progress.map((p) => p.lessonId));
  const isDone = completedIds.has(lesson.id);

  const isAdmin = session.user.role === 'ADMIN';
  const comments = unlocked
    ? await prisma.lessonComment.findMany({
        where: { lessonId: lesson.id, parentId: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { name: true, image: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { name: true, image: true, role: true } } },
          },
        },
      })
    : [];

  const prev = lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
  const next = lessonIndex < course.lessons.length - 1 ? course.lessons[lessonIndex + 1] : null;
  const embed = toEmbedUrl(lesson.videoUrl);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_280px]">
      {/* Contenido principal */}
      <main className="min-w-0">
        <Link
          href={`/academia/${course.slug}`}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          ← {course.title}
        </Link>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">{lesson.title}</h1>
        {lesson.description && <p className="mt-2 text-sm text-[var(--color-muted)]">{lesson.description}</p>}

        <div className="mt-5">
          {!unlocked ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
              <p className="text-3xl">🔒</p>
              <p className="mt-3 font-medium">Lección premium</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-muted)]">
                Suscríbete para desbloquear esta lección y todo el contenido del curso.
              </p>
              <Link
                href="/planes"
                className="mt-5 inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Ver planes
              </Link>
            </div>
          ) : (
            <>
              {lesson.type === 'VIDEO' &&
                (embed ? (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
                    <iframe
                      src={embed}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-muted)]">
                    Esta lección aún no tiene un video válido configurado.
                  </div>
                ))}

              {lesson.type === 'PDF' && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
                  <p className="text-3xl">📄</p>
                  <p className="mt-3 font-medium">Material en PDF</p>
                  {lesson.storageKey?.startsWith('http') ? (
                    <a
                      href={lesson.storageKey}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                    >
                      Abrir / Descargar PDF
                    </a>
                  ) : (
                    <p className="mt-2 break-all text-xs text-[var(--color-muted)]">
                      Recurso: {lesson.storageKey ?? '—'}
                    </p>
                  )}
                </div>
              )}

              {lesson.type === 'TEXT' && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-fg)]/90">
                    {lesson.contentText || 'Sin contenido.'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Acciones */}
        {unlocked && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <form action={toggleLessonComplete}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              <button
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isDone
                    ? 'border border-green-500/30 text-green-400 hover:bg-green-500/10'
                    : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
                }`}
              >
                {isDone ? '✓ Completada (desmarcar)' : 'Marcar como completada'}
              </button>
            </form>
            <div className="flex gap-2">
              {prev && (
                <Link
                  href={`/academia/${course.slug}/${prev.id}`}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
                >
                  ← Anterior
                </Link>
              )}
              {next && (
                <Link
                  href={`/academia/${course.slug}/${next.id}`}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
        {/* Comentarios / Preguntas */}
        {unlocked && (
          <section className="mt-10 border-t border-[var(--color-border)] pt-8">
            <h2 className="mb-4 font-semibold">Preguntas y comentarios ({comments.length})</h2>

            <form action={postComment} className="mb-6">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="courseSlug" value={course.slug} />
              <textarea
                name="body"
                rows={3}
                required
                maxLength={2000}
                placeholder="Escribe tu pregunta o comentario sobre esta lección…"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
              />
              <div className="mt-2 flex justify-end">
                <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                  Publicar
                </button>
              </div>
            </form>

            {comments.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Sé el primero en comentar.</p>
            ) : (
              <ul className="space-y-5">
                {comments.map((c) => (
                  <li key={c.id}>
                    <div className="flex gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-xs font-semibold text-[var(--color-accent)]">
                        {(c.user.name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{c.user.name ?? 'Usuario'}</span>{' '}
                          <span className="text-xs text-[var(--color-muted)]">· {dateTime(c.createdAt)}</span>
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--color-fg)]/90">{c.body}</p>

                        <div className="mt-1 flex items-center gap-3 text-xs">
                          <details className="inline">
                            <summary className="cursor-pointer list-none text-[var(--color-muted)] hover:text-[var(--color-fg)]">
                              Responder
                            </summary>
                            <form action={postComment} className="mt-2 flex gap-2">
                              <input type="hidden" name="lessonId" value={lesson.id} />
                              <input type="hidden" name="courseSlug" value={course.slug} />
                              <input type="hidden" name="parentId" value={c.id} />
                              <input
                                name="body"
                                required
                                maxLength={2000}
                                placeholder="Tu respuesta…"
                                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
                              />
                              <button className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs transition-colors hover:bg-white/5">
                                Enviar
                              </button>
                            </form>
                          </details>
                          {(c.userId === userId || isAdmin) && (
                            <form action={deleteComment}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="lessonId" value={lesson.id} />
                              <input type="hidden" name="courseSlug" value={course.slug} />
                              <button className="text-red-400/80 hover:text-red-400">Eliminar</button>
                            </form>
                          )}
                        </div>

                        {/* Respuestas */}
                        {c.replies.length > 0 && (
                          <ul className="mt-3 space-y-3 border-l border-[var(--color-border)] pl-4">
                            {c.replies.map((r) => (
                              <li key={r.id} className="flex gap-2">
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-[var(--color-muted)]">
                                  {(r.user.name ?? 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm">
                                    <span className="font-medium">{r.user.name ?? 'Usuario'}</span>{' '}
                                    {r.user.role === 'ADMIN' && (
                                      <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                                        Instructor
                                      </span>
                                    )}{' '}
                                    <span className="text-xs text-[var(--color-muted)]">· {dateTime(r.createdAt)}</span>
                                  </p>
                                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--color-fg)]/90">{r.body}</p>
                                  {(r.userId === userId || isAdmin) && (
                                    <form action={deleteComment} className="mt-1">
                                      <input type="hidden" name="id" value={r.id} />
                                      <input type="hidden" name="lessonId" value={lesson.id} />
                                      <input type="hidden" name="courseSlug" value={course.slug} />
                                      <button className="text-xs text-red-400/80 hover:text-red-400">Eliminar</button>
                                    </form>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {/* Barra lateral con lecciones */}
      <aside className="lg:border-l lg:border-[var(--color-border)] lg:pl-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Lecciones
        </p>
        <ol className="space-y-1">
          {course.lessons.map((l, i) => {
            const active = l.id === lesson.id;
            const ld = completedIds.has(l.id);
            const lUnlocked = access || l.isFreePreview;
            return (
              <li key={l.id}>
                <Link
                  href={`/academia/${course.slug}/${l.id}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      ld ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[var(--color-muted)]'
                    }`}
                  >
                    {ld ? '✓' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                  {!lUnlocked && <span className="text-xs">🔒</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
