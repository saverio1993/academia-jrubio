import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { auth } from '@/auth';
import { hasActiveSubscription, canAccessCourse, evaluateCourseCompletion } from '@/lib/access';
import { submitQuiz } from '../../actions';

export const dynamic = 'force-dynamic';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default async function ExamenPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ score?: string; passed?: string }>;
}) {
  const { slug } = await params;
  const { score, passed } = await searchParams;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: { quiz: { include: { questions: { orderBy: { sortOrder: 'asc' } } } } },
  });
  if (!course || !course.isPublished) notFound();
  if (!course.quiz || course.quiz.questions.length === 0) redirect(`/academia/${slug}`);

  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/academia/${slug}/examen`);
  const userId = session.user.id;

  const hasSub = await hasActiveSubscription(userId);
  if (!canAccessCourse(course.isPremium, hasSub)) redirect(`/academia/${slug}`);

  const quiz = course.quiz;

  // Resultado tras enviar
  if (score !== undefined) {
    const sc = Number(score);
    const ok = passed === '1';
    const { lessonsDone } = await evaluateCourseCompletion(userId, course.id);
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-6xl">{ok ? '🎉' : '📚'}</p>
        <h1 className="mt-4 text-2xl font-bold">{ok ? '¡Aprobaste!' : 'Sigue practicando'}</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Obtuviste <span className="font-semibold text-[var(--color-fg)]">{sc}%</span> · mínimo para aprobar{' '}
          {quiz.passingScore}%
        </p>

        {ok && !lessonsDone && (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Completa todas las lecciones para recibir tu certificado.
          </p>
        )}

        <div className="mt-8 flex justify-center gap-3">
          {ok && lessonsDone ? (
            <Link
              href={`/academia/${slug}/certificado`}
              className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Ver mi certificado
            </Link>
          ) : (
            <Link
              href={`/academia/${slug}/examen`}
              className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Reintentar examen
            </Link>
          )}
          <Link
            href={`/academia/${slug}`}
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            Volver al curso
          </Link>
        </div>
      </main>
    );
  }

  // Formulario del examen
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/academia/${slug}`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        ← {course.title}
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{quiz.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {quiz.questions.length} pregunta(s) · necesitas {quiz.passingScore}% para aprobar
      </p>

      <form action={submitQuiz} className="mt-8 space-y-6">
        <input type="hidden" name="quizId" value={quiz.id} />
        <input type="hidden" name="courseSlug" value={slug} />

        {quiz.questions.map((q, i) => {
          const options = (q.options as string[]) ?? [];
          return (
            <div key={q.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <p className="mb-3 font-medium">
                <span className="text-[var(--color-muted)]">{i + 1}.</span> {q.text}
              </p>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <label
                    key={idx}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  >
                    <input type="radio" name={`q_${q.id}`} value={idx} required className="accent-[var(--color-accent)]" />
                    <span className="text-xs text-[var(--color-muted)]">{LETTERS[idx]}</span>
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <button className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
          Enviar respuestas
        </button>
      </form>
    </main>
  );
}
