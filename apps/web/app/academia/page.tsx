import Link from 'next/link';
import { prisma } from '@academia/db';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export default async function AcademiaCatalog() {
  const session = await auth();
  const userId = session?.user?.id;

  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { lessons: true } } },
  });

  // Progreso del usuario (si está logueado)
  const progressByCourse = new Map<string, number>();
  if (userId && courses.length > 0) {
    const rows = await prisma.lessonProgress.findMany({
      where: { userId, lesson: { courseId: { in: courses.map((c) => c.id) } } },
      select: { lesson: { select: { courseId: true } } },
    });
    for (const r of rows) {
      progressByCourse.set(r.lesson.courseId, (progressByCourse.get(r.lesson.courseId) ?? 0) + 1);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Academia</h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          Cursos prácticos de reparación, desbloqueo, FRP y software para técnicos de telefonía móvil.
          Aprende a tu ritmo y obtén tu certificado.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-muted)]">
          Pronto publicaremos los primeros cursos.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const total = c._count.lessons;
            const done = progressByCourse.get(c.id) ?? 0;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <Link
                key={c.id}
                href={`/academia/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] transition-colors hover:border-[var(--color-accent)]/40"
              >
                <div
                  className="flex aspect-video items-center justify-center bg-gradient-to-br from-[var(--color-accent)]/20 to-purple-500/10 bg-cover bg-center"
                  style={c.coverImage ? { backgroundImage: `url(${c.coverImage})` } : undefined}
                >
                  {!c.coverImage && (
                    <span className="text-4xl font-black text-[var(--color-accent)]/40">JR</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <span>{LEVEL_LABEL[c.level]}</span>
                    <span>·</span>
                    <span>{total} lección(es)</span>
                    {c.isPremium && (
                      <span className="ml-auto rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 font-medium text-[var(--color-accent)]">
                        Premium
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold leading-snug transition-colors group-hover:text-[var(--color-accent)]">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">{c.description}</p>
                  )}
                  {done > 0 && (
                    <div className="mt-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                        <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{pct}% completado</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
