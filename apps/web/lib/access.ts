import { randomBytes } from 'crypto';
import { prisma } from '@academia/db';

/** ¿El usuario tiene una suscripción ACTIVE y no vencida? */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(sub);
}

/**
 * ¿Puede el usuario ver el contenido completo de este curso?
 * - Cursos no premium: cualquier usuario autenticado.
 * - Cursos premium: requiere suscripción activa.
 * (Las lecciones marcadas como vista previa siempre son accesibles.)
 */
export function canAccessCourse(isPremium: boolean, hasSub: boolean): boolean {
  return !isPremium || hasSub;
}

/** Progreso del usuario en un curso: completadas / total y porcentaje. */
export async function courseProgress(userId: string, courseId: string) {
  const [total, done] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { courseId } } }),
  ]);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

/** Evalúa si el curso está completo: todas las lecciones + (si hay examen) examen aprobado. */
export async function evaluateCourseCompletion(userId: string, courseId: string) {
  const [total, done, quiz] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({ where: { userId, lesson: { courseId } } }),
    prisma.quiz.findUnique({ where: { courseId }, select: { id: true } }),
  ]);
  const lessonsDone = total > 0 && done >= total;
  let quizOk = true;
  if (quiz) {
    const passed = await prisma.quizAttempt.findFirst({
      where: { quizId: quiz.id, userId, passed: true },
      select: { id: true },
    });
    quizOk = Boolean(passed);
  }
  return { total, done, lessonsDone, hasQuiz: Boolean(quiz), quizOk, complete: lessonsDone && quizOk };
}

/** Marca el curso como completado y emite el certificado si corresponde. */
export async function syncCertificate(userId: string, courseId: string): Promise<boolean> {
  const { complete } = await evaluateCourseCompletion(userId, courseId);
  if (complete) {
    await prisma.enrollment.updateMany({ where: { userId, courseId }, data: { completedAt: new Date() } });
    await prisma.certificate.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, code: `AJR-${randomBytes(4).toString('hex').toUpperCase()}` },
      update: {},
    });
  } else {
    await prisma.enrollment.updateMany({
      where: { userId, courseId, NOT: { completedAt: null } },
      data: { completedAt: null },
    });
  }
  return complete;
}
