import Link from 'next/link';
import { prisma } from '@academia/db';
import { dateShort } from '@/lib/format';
import { PageHeader, Card, Badge, Empty, inputCls } from '../_components/ui';
import { createCourse } from './actions';

export const dynamic = 'force-dynamic';

const LEVELS = [
  { v: 'BEGINNER', l: 'Principiante' },
  { v: 'INTERMEDIATE', l: 'Intermedio' },
  { v: 'ADVANCED', l: 'Avanzado' },
];

export default async function CursosPage() {
  const courses = await prisma.course.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <>
      <PageHeader title="Cursos" subtitle={`${courses.length} curso(s) en la academia`} />

      {/* Crear curso */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-semibold">Crear curso</h2>
        <form action={createCourse} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Slug</span>
            <input name="slug" placeholder="frp-samsung" className={inputCls} required />
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Título</span>
            <input name="title" placeholder="Eliminación de FRP en Samsung" className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Nivel</span>
            <select name="level" defaultValue="BEGINNER" className={inputCls}>
              {LEVELS.map((l) => (
                <option key={l.v} value={l.v}>
                  {l.l}
                </option>
              ))}
            </select>
          </label>
          <div className="lg:col-span-4">
            <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
              Crear y agregar lecciones
            </button>
          </div>
        </form>
      </Card>

      {courses.length === 0 ? (
        <Empty>Aún no hay cursos. Crea el primero arriba.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cursos/${c.id}`}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                {c.isPublished ? <Badge color="green">Publicado</Badge> : <Badge color="gray">Borrador</Badge>}
                <span className="font-mono text-xs text-[var(--color-muted)]">/{c.slug}</span>
              </div>
              <h3 className="font-semibold leading-snug transition-colors group-hover:text-[var(--color-accent)]">
                {c.title}
              </h3>
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {c._count.lessons} lección(es) · {c.level} · {dateShort(c.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
