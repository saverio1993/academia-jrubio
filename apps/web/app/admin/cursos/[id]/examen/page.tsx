import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@academia/db';
import { Card, Empty, inputCls, btnDanger } from '../../../_components/ui';
import {
  saveQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from '../../quiz-actions';

export const dynamic = 'force-dynamic';

const LETTERS = ['A', 'B', 'C', 'D'];

export default async function ExamenAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      quiz: { include: { questions: { orderBy: { sortOrder: 'asc' } }, _count: { select: { attempts: true } } } },
    },
  });
  if (!course) notFound();
  const quiz = course.quiz;

  return (
    <>
      <div className="mb-6">
        <Link href={`/admin/cursos/${course.id}`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
          ← {course.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Evaluación del curso</h1>
      </div>

      {/* Config del examen */}
      <Card className="mb-6 p-5">
        <form action={saveQuiz} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="courseId" value={course.id} />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Título del examen</span>
            <input name="title" defaultValue={quiz?.title ?? 'Evaluación final'} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Nota mínima para aprobar (%)</span>
            <input name="passingScore" type="number" min="0" max="100" defaultValue={quiz?.passingScore ?? 70} className={inputCls} />
          </label>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
              {quiz ? 'Guardar configuración' : 'Crear examen'}
            </button>
            {quiz && (
              <span className="text-xs text-[var(--color-muted)]">
                {quiz.questions.length} pregunta(s) · {quiz._count.attempts} intento(s)
              </span>
            )}
          </div>
        </form>
      </Card>

      {!quiz ? (
        <Empty>Crea el examen arriba para empezar a agregar preguntas.</Empty>
      ) : (
        <>
          <h2 className="mb-3 font-semibold">Preguntas</h2>
          {quiz.questions.length === 0 ? (
            <Empty>Sin preguntas todavía. Agrega la primera abajo.</Empty>
          ) : (
            <div className="space-y-2">
              {quiz.questions.map((q, i) => {
                const options = (q.options as string[]) ?? [];
                return (
                  <Card key={q.id} className="overflow-hidden">
                    <details>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02]">
                        <span className="min-w-0 truncate text-sm">
                          <span className="text-[var(--color-muted)]">#{i + 1}</span> {q.text}
                        </span>
                        <span className="shrink-0 text-xs text-green-400">
                          Correcta: {LETTERS[q.correctIndex] ?? q.correctIndex + 1}
                        </span>
                      </summary>
                      <div className="border-t border-[var(--color-border)] p-5">
                        <form action={updateQuestion} className="space-y-3">
                          <input type="hidden" name="id" value={q.id} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="sortOrder" value={q.sortOrder} />
                          <label className="block">
                            <span className="mb-1 block text-xs text-[var(--color-muted)]">Enunciado</span>
                            <textarea name="text" defaultValue={q.text} rows={2} className={inputCls} />
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {LETTERS.map((L, idx) => (
                              <label key={idx} className="block">
                                <span className="mb-1 block text-xs text-[var(--color-muted)]">Opción {L}</span>
                                <input name={`option${idx}`} defaultValue={options[idx] ?? ''} className={inputCls} />
                              </label>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm">
                              <span className="text-xs text-[var(--color-muted)]">Respuesta correcta</span>
                              <select name="correctIndex" defaultValue={q.correctIndex} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs">
                                {LETTERS.map((L, idx) => (
                                  <option key={idx} value={idx}>{L}</option>
                                ))}
                              </select>
                            </label>
                            <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                              Guardar
                            </button>
                          </div>
                        </form>
                        <form action={deleteQuestion} className="mt-3">
                          <input type="hidden" name="id" value={q.id} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <button className={btnDanger}>Eliminar pregunta</button>
                        </form>
                      </div>
                    </details>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Agregar pregunta */}
          <Card className="mt-6 p-5">
            <h3 className="mb-4 font-semibold">Agregar pregunta</h3>
            <form action={addQuestion} className="space-y-3">
              <input type="hidden" name="quizId" value={quiz.id} />
              <input type="hidden" name="courseId" value={course.id} />
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-muted)]">Enunciado *</span>
                <textarea name="text" rows={2} placeholder="¿Qué herramienta se usa para…?" className={inputCls} required />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {LETTERS.map((L, idx) => (
                  <label key={idx} className="block">
                    <span className="mb-1 block text-xs text-[var(--color-muted)]">Opción {L}{idx < 2 ? ' *' : ''}</span>
                    <input name={`option${idx}`} placeholder={`Respuesta ${L}`} className={inputCls} />
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-[var(--color-muted)]">Respuesta correcta</span>
                  <select name="correctIndex" defaultValue={0} className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs">
                    {LETTERS.map((L, idx) => (
                      <option key={idx} value={idx}>{L}</option>
                    ))}
                  </select>
                </label>
                <button className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5">
                  Agregar pregunta
                </button>
              </div>
            </form>
          </Card>

          <Card className="mt-8 border-red-500/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-muted)]">Eliminar el examen borra todas sus preguntas e intentos.</p>
              <form action={deleteQuiz}>
                <input type="hidden" name="courseId" value={course.id} />
                <button className={btnDanger}>Eliminar examen</button>
              </form>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
