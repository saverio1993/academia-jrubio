import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@academia/db';
import { auth } from '@/auth';
import { hasActiveSubscription, canAccessCourse } from '@/lib/access';
import { enrollCourse } from '../actions';

export const dynamic = 'force-dynamic';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

function fmtDuration(sec: number | null) {
  if (!sec) return null;
  const m = Math.round(sec / 60);
  return `${m} min`;
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      lessons: { orderBy: { sortOrder: 'asc' } },
      quiz: { include: { _count: { select: { questions: true } } } },
    },
  });
  if (!course || !course.isPublished) notFound();
  const hasQuiz = Boolean(course.quiz && course.quiz._count.questions > 0);

  const session = await auth();
  const userId = session?.user?.id;

  const hasSub = userId ? await hasActiveSubscription(userId) : false;
  const access = canAccessCourse(course.isPremium, hasSub);

  let completedIds = new Set<string>();
  let enrolled = false;
  let certificate: { code: string } | null = null;
  let quizPassed = false;
  if (userId && hasQuiz && course.quiz) {
    const att = await prisma.quizAttempt.findFirst({
      where: { quizId: course.quiz.id, userId, passed: true },
      select: { id: true },
    });
    quizPassed = Boolean(att);
  }
  if (userId) {
    const [progress, enrollment, cert] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { userId, lesson: { courseId: course.id } },
        select: { lessonId: true },
      }),
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { id: true },
      }),
      prisma.certificate.findUnique({
        where: { userId_courseId: { userId, courseId: course.id } },
        select: { code: true },
      }),
    ]);
    completedIds = new Set(progress.map((p) => p.lessonId));
    enrolled = Boolean(enrollment);
    certificate = cert;
  }

  const total = course.lessons.length;
  const done = course.lessons.filter((l) => completedIds.has(l.id)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const firstLesson = course.lessons.find((l) => !completedIds.has(l.id)) ?? course.lessons[0];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/academia" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        ← Academia
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
        <span>{LEVEL_LABEL[course.level]}</span>
        <span>·</span>
        <span>{total} lección(es)</span>
        {course.isPremium && (
          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 font-medium text-[var(--color-accent)]">
            Premium
          </span>
        )}
      </div>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">{course.title}</h1>
      {course.description && <p className="mt-3 text-[var(--color-muted)]">{course.description}</p>}

      {/* Estado / CTA */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        {!userId ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-muted)]">Inicia sesión para empezar el curso.</p>
            <Link
              href={`/signin?callbackUrl=/academia/${course.slug}`}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : course.isPremium && !hasSub ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-muted)]">
              Este curso es premium. Suscríbete para acceder a todas las lecciones.
            </p>
            <Link
              href="/planes"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Ver planes
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[200px] flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {done}/{total} completadas · {pct}%
              </p>
            </div>
            {firstLesson && (
              <Link
                href={`/academia/${course.slug}/${firstLesson.id}`}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                {enrolled || done > 0 ? 'Continuar' : 'Empezar curso'}
              </Link>
            )}
          </div>
        )}

        {certificate && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm">
            <span className="text-green-400">¡Curso completado! 🎓</span>
            <Link href={`/academia/${course.slug}/certificado`} className="font-medium text-green-400 hover:underline">
              Ver certificado →
            </Link>
          </div>
        )}

        {userId && !enrolled && (!course.isPremium || hasSub) && (
          <form action={enrollCourse} className="mt-4">
            <input type="hidden" name="courseId" value={course.id} />
            <button className="text-sm text-[var(--color-accent)] hover:underline">Inscribirme en este curso</button>
          </form>
        )}
      </div>

      {/* Lista de lecciones */}
      <h2 className="mb-3 mt-8 font-semibold">Contenido del curso</h2>
      <ol className="space-y-2">
        {course.lessons.map((l, i) => {
          const unlocked = access || l.isFreePreview;
          const isDone = completedIds.has(l.id);
          const inner = (
            <div
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                unlocked
                  ? 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-accent)]/40'
                  : 'border-[var(--color-border)] bg-[var(--color-card)]/50 opacity-70'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    isDone ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[var(--color-muted)]'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {l.type}
                    {fmtDuration(l.durationSec) ? ` · ${fmtDuration(l.durationSec)}` : ''}
                    {l.isFreePreview ? ' · Vista previa' : ''}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">{unlocked ? '▶' : '🔒'}</span>
            </div>
          );
          return (
            <li key={l.id}>
              {unlocked ? <Link href={`/academia/${course.slug}/${l.id}`}>{inner}</Link> : inner}
            </li>
          );
        })}
      </ol>

      {/* Evaluación final */}
      {hasQuiz && access && (
        <div className="mt-6">
          <Link
            href={`/academia/${course.slug}/examen`}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-xs text-[var(--color-accent)]">
                📝
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{course.quiz?.title}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  Evaluación final · {course.quiz?._count.questions} pregunta(s)
                </p>
              </div>
            </div>
            {quizPassed ? (
              <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                Aprobado ✓
              </span>
            ) : (
              <span className="shrink-0 text-xs text-[var(--color-accent)]">Tomar examen →</span>
            )}
          </Link>
        </div>
      )}
    </main>
  );
}
