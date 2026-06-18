'use server';

import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { syncCertificate } from '@/lib/access';

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/academia');
  return session.user.id;
}

/** Inscribe al usuario en un curso y lo lleva a la primera lección. */
export async function enrollCourse(formData: FormData) {
  const userId = await requireUserId();
  const courseId = String(formData.get('courseId'));
  if (!courseId) throw new Error('Curso inválido');

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { sortOrder: 'asc' }, take: 1, select: { id: true } } },
  });
  if (!course || !course.isPublished) throw new Error('Curso no disponible');

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
  });

  revalidatePath(`/academia/${course.slug}`);
  if (course.lessons[0]) redirect(`/academia/${course.slug}/${course.lessons[0].id}`);
  redirect(`/academia/${course.slug}`);
}

/** Marca/desmarca una lección como completada y actualiza el certificado. */
export async function toggleLessonComplete(formData: FormData) {
  const userId = await requireUserId();
  const lessonId = String(formData.get('lessonId'));
  const courseSlug = String(formData.get('courseSlug'));
  if (!lessonId) throw new Error('Lección inválida');

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson) throw new Error('Lección no encontrada');

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.lessonProgress.delete({ where: { id: existing.id } });
  } else {
    await prisma.lessonProgress.create({ data: { userId, lessonId } });
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
      create: { userId, courseId: lesson.courseId },
      update: {},
    });
  }

  await syncCertificate(userId, lesson.courseId);

  if (courseSlug) {
    revalidatePath(`/academia/${courseSlug}`);
    revalidatePath(`/academia/${courseSlug}/${lessonId}`);
  }
}

/** Califica un intento de examen y emite certificado si aprueba y completó las lecciones. */
export async function submitQuiz(formData: FormData) {
  const userId = await requireUserId();
  const quizId = String(formData.get('quizId'));
  const courseSlug = String(formData.get('courseSlug'));
  if (!quizId) throw new Error('Examen inválido');

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { sortOrder: 'asc' } }, course: { select: { id: true, slug: true } } },
  });
  if (!quiz || quiz.questions.length === 0) throw new Error('Examen no disponible');

  let correct = 0;
  for (const q of quiz.questions) {
    const ans = Number(formData.get(`q_${q.id}`));
    if (Number.isInteger(ans) && ans === q.correctIndex) correct++;
  }
  const score = Math.round((correct / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  await prisma.quizAttempt.create({ data: { quizId, userId, score, passed } });
  if (passed) await syncCertificate(userId, quiz.course.id);

  revalidatePath(`/academia/${courseSlug || quiz.course.slug}`);
  redirect(`/academia/${courseSlug || quiz.course.slug}/examen?score=${score}&passed=${passed ? 1 : 0}`);
}

/** Publica un comentario o respuesta en una lección. */
export async function postComment(formData: FormData) {
  const userId = await requireUserId();
  const lessonId = String(formData.get('lessonId'));
  const courseSlug = String(formData.get('courseSlug'));
  const body = String(formData.get('body') ?? '').trim();
  const parentId = String(formData.get('parentId') ?? '').trim() || null;
  if (!lessonId || !body) throw new Error('Escribe un comentario');
  if (body.length > 2000) throw new Error('Comentario demasiado largo');

  await prisma.lessonComment.create({ data: { lessonId, userId, body, parentId } });
  if (courseSlug) revalidatePath(`/academia/${courseSlug}/${lessonId}`);
}

/** Elimina un comentario (autor o admin). */
export async function deleteComment(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get('id'));
  const lessonId = String(formData.get('lessonId'));
  const courseSlug = String(formData.get('courseSlug'));
  if (!id) throw new Error('Comentario inválido');

  const [comment, me] = await Promise.all([
    prisma.lessonComment.findUnique({ where: { id }, select: { userId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ]);
  if (!comment) return;
  if (comment.userId !== userId && me?.role !== 'ADMIN') throw new Error('No autorizado');

  await prisma.lessonComment.delete({ where: { id } });
  if (courseSlug && lessonId) revalidatePath(`/academia/${courseSlug}/${lessonId}`);
}
