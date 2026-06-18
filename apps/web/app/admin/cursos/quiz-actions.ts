'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { assertAdmin, logAudit } from '@/lib/admin';

/** Crea el examen del curso (si no existe) o actualiza título y nota mínima. */
export async function saveQuiz(formData: FormData) {
  const admin = await assertAdmin();
  const courseId = String(formData.get('courseId'));
  const title = String(formData.get('title') ?? '').trim() || 'Evaluación final';
  const passingScore = Math.min(100, Math.max(0, Number(formData.get('passingScore') ?? 70) || 70));
  if (!courseId) throw new Error('Curso inválido');

  await prisma.quiz.upsert({
    where: { courseId },
    create: { courseId, title, passingScore },
    update: { title, passingScore },
  });
  await logAudit(admin.id, 'quiz.saved', `course:${courseId}`, { passingScore });
  revalidatePath(`/admin/cursos/${courseId}/examen`);
}

export async function deleteQuiz(formData: FormData) {
  const admin = await assertAdmin();
  const courseId = String(formData.get('courseId'));
  if (!courseId) throw new Error('Curso inválido');
  await prisma.quiz.deleteMany({ where: { courseId } });
  await logAudit(admin.id, 'quiz.deleted', `course:${courseId}`);
  revalidatePath(`/admin/cursos/${courseId}/examen`);
}

function collectOptions(formData: FormData): string[] {
  const opts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const v = String(formData.get(`option${i}`) ?? '').trim();
    if (v) opts.push(v);
  }
  return opts;
}

export async function addQuestion(formData: FormData) {
  const admin = await assertAdmin();
  const quizId = String(formData.get('quizId'));
  const courseId = String(formData.get('courseId'));
  const text = String(formData.get('text') ?? '').trim();
  const correctIndex = Number(formData.get('correctIndex') ?? 0) || 0;
  const options = collectOptions(formData);
  if (!quizId || !text) throw new Error('Falta el enunciado');
  if (options.length < 2) throw new Error('Agrega al menos 2 opciones');
  if (correctIndex >= options.length) throw new Error('La respuesta correcta no es válida');

  const count = await prisma.quizQuestion.count({ where: { quizId } });
  await prisma.quizQuestion.create({
    data: { quizId, text, options, correctIndex, sortOrder: count },
  });
  await logAudit(admin.id, 'quiz.question.added', `quiz:${quizId}`);
  revalidatePath(`/admin/cursos/${courseId}/examen`);
}

export async function updateQuestion(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const courseId = String(formData.get('courseId'));
  const text = String(formData.get('text') ?? '').trim();
  const correctIndex = Number(formData.get('correctIndex') ?? 0) || 0;
  const options = collectOptions(formData);
  if (!id || !text) throw new Error('Datos inválidos');
  if (options.length < 2) throw new Error('Agrega al menos 2 opciones');
  if (correctIndex >= options.length) throw new Error('La respuesta correcta no es válida');

  await prisma.quizQuestion.update({
    where: { id },
    data: { text, options, correctIndex, sortOrder: Number(formData.get('sortOrder') ?? 0) || 0 },
  });
  await logAudit(admin.id, 'quiz.question.updated', `question:${id}`);
  revalidatePath(`/admin/cursos/${courseId}/examen`);
}

export async function deleteQuestion(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const courseId = String(formData.get('courseId'));
  if (!id) throw new Error('Pregunta inválida');
  await prisma.quizQuestion.delete({ where: { id } });
  await logAudit(admin.id, 'quiz.question.deleted', `question:${id}`);
  revalidatePath(`/admin/cursos/${courseId}/examen`);
}
