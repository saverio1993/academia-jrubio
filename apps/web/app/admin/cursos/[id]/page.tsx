import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@academia/db';
import { Card, Badge, Empty, inputCls, btnDanger } from '../../_components/ui';
import {
  updateCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../actions';

export const dynamic = 'force-dynamic';

const LEVELS = [
  { v: 'BEGINNER', l: 'Principiante' },
  { v: 'INTERMEDIATE', l: 'Intermedio' },
  { v: 'ADVANCED', l: 'Avanzado' },
];
const TYPES = [
  { v: 'VIDEO', l: 'Video' },
  { v: 'PDF', l: 'PDF' },
  { v: 'TEXT', l: 'Texto' },
];
const TYPE_COLOR = { VIDEO: 'blue', PDF: 'orange', TEXT: 'gray' } as const;

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { lessons: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!course) notFound();

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/cursos" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
          ← Volver a cursos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{course.title}</h1>
        <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">/{course.slug}</p>
      </div>

      {/* Editar curso */}
      <Card className="mb-8 p-5">
        <h2 className="mb-4 font-semibold">Detalles del curso</h2>
        <form action={updateCourse} className="space-y-4">
          <input type="hidden" name="id" value={course.id} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Título</span>
              <input name="title" defaultValue={course.title} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Nivel</span>
              <select name="level" defaultValue={course.level} className={inputCls}>
                {LEVELS.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Orden</span>
              <input name="sortOrder" type="number" defaultValue={course.sortOrder} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Descripción</span>
            <textarea name="description" defaultValue={course.description ?? ''} rows={3} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Imagen de portada (URL)</span>
            <input name="coverImage" defaultValue={course.coverImage ?? ''} className={inputCls} />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isPublished" defaultChecked={course.isPublished} className="accent-[var(--color-accent)]" />
                Publicado
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isPremium" defaultChecked={course.isPremium} className="accent-[var(--color-accent)]" />
                Premium
              </label>
            </div>
            <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
              Guardar curso
            </button>
          </div>
        </form>
      </Card>

      {/* Lecciones */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Lecciones ({course.lessons.length})</h2>
        <Link
          href={`/admin/cursos/${course.id}/examen`}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/5"
        >
          Gestionar examen →
        </Link>
      </div>

      {course.lessons.length === 0 ? (
        <Empty>Este curso aún no tiene lecciones. Agrega la primera abajo.</Empty>
      ) : (
        <div className="space-y-2">
          {course.lessons.map((les, i) => (
            <Card key={les.id} className="overflow-hidden">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xs text-[var(--color-muted)]">#{i + 1}</span>
                    <p className="truncate font-medium">{les.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {les.isFreePreview && <Badge color="green">Vista previa</Badge>}
                    <Badge color={TYPE_COLOR[les.type]}>{les.type}</Badge>
                  </div>
                </summary>
                <div className="border-t border-[var(--color-border)] p-5">
                  <form action={updateLesson} className="space-y-3">
                    <input type="hidden" name="id" value={les.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block lg:col-span-2">
                        <span className="mb-1 block text-xs text-[var(--color-muted)]">Título</span>
                        <input name="title" defaultValue={les.title} className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-[var(--color-muted)]">Tipo</span>
                        <select name="type" defaultValue={les.type} className={inputCls}>
                          {TYPES.map((t) => (
                            <option key={t.v} value={t.v}>
                              {t.l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-[var(--color-muted)]">Orden</span>
                        <input name="sortOrder" type="number" defaultValue={les.sortOrder} className={inputCls} />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="mb-1 block text-xs text-[var(--color-muted)]">URL de video</span>
                        <input name="videoUrl" defaultValue={les.videoUrl ?? ''} placeholder="https://youtube.com/…" className={inputCls} />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="mb-1 block text-xs text-[var(--color-muted)]">Ruta PDF (Nextcloud)</span>
                        <input name="storageKey" defaultValue={les.storageKey ?? ''} placeholder="/cursos/…/manual.pdf" className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-[var(--color-muted)]">Duración (seg)</span>
                        <input name="durationSec" type="number" defaultValue={les.durationSec ?? ''} className={inputCls} />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs text-[var(--color-muted)]">Contenido (para lección de texto)</span>
                      <textarea name="contentText" defaultValue={les.contentText ?? ''} rows={3} className={inputCls} />
                    </label>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="isFreePreview" defaultChecked={les.isFreePreview} className="accent-[var(--color-accent)]" />
                        Vista previa gratuita
                      </label>
                      <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                        Guardar lección
                      </button>
                    </div>
                  </form>
                  <form action={deleteLesson} className="mt-3">
                    <input type="hidden" name="id" value={les.id} />
                    <input type="hidden" name="courseId" value={course.id} />
                    <button className={btnDanger}>Eliminar lección</button>
                  </form>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}

      {/* Agregar lección */}
      <Card className="mt-6 p-5">
        <h3 className="mb-4 font-semibold">Agregar lección</h3>
        <form action={createLesson} className="space-y-3">
          <input type="hidden" name="courseId" value={course.id} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Título *</span>
              <input name="title" placeholder="Paso 1: Preparar el equipo" className={inputCls} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Tipo</span>
              <select name="type" defaultValue="VIDEO" className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input type="checkbox" name="isFreePreview" className="accent-[var(--color-accent)]" />
              Vista previa
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">URL de video</span>
              <input name="videoUrl" placeholder="https://youtube.com/…" className={inputCls} />
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Ruta PDF (Nextcloud)</span>
              <input name="storageKey" placeholder="/cursos/…/manual.pdf" className={inputCls} />
            </label>
          </div>
          <button className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5">
            Agregar lección
          </button>
        </form>
      </Card>

      {/* Eliminar curso */}
      <Card className="mt-8 border-red-500/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-red-400">Zona de peligro</h3>
            <p className="text-sm text-[var(--color-muted)]">
              Eliminar el curso borra también todas sus lecciones. No se puede deshacer.
            </p>
          </div>
          <form action={deleteCourse}>
            <input type="hidden" name="id" value={course.id} />
            <button className={btnDanger}>Eliminar curso</button>
          </form>
        </div>
      </Card>
    </>
  );
}
