'use server';

import type { CourseLevel, LessonType } from '@academia/db';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertAdmin, logAudit } from '@/lib/admin';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
const TYPES = ['VIDEO', 'PDF', 'TEXT'] as const;

/* ---------------- Cursos ---------------- */

export async function createCourse(formData: FormData) {
  const admin = await assertAdmin();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const title = String(formData.get('title') ?? '').trim();
  const level = String(formData.get('level') ?? 'BEGINNER') as CourseLevel;

  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Slug inválido (solo letras, números y guiones)');
  if (!title) throw new Error('Falta el título');
  if (!LEVELS.includes(level)) throw new Error('Nivel inválido');

  const exists = await prisma.course.findUnique({ where: { slug } });
  if (exists) throw new Error('Ya existe un curso con ese slug');

  const course = await prisma.course.create({ data: { slug, title, level } });
  await logAudit(admin.id, 'course.created', `course:${course.id}`, { slug, title });
  revalidatePath('/admin/cursos');
  redirect(`/admin/cursos/${course.id}`);
}

export async function updateCourse(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const coverImage = String(formData.get('coverImage') ?? '').trim();
  const level = String(formData.get('level') ?? 'BEGINNER') as CourseLevel;
  const sortOrder = Number(formData.get('sortOrder') ?? 0) || 0;
  const isPublished = formData.get('isPublished') === 'on';
  const isPremium = formData.get('isPremium') === 'on';

  if (!id || !title) throw new Error('Datos inválidos');
  if (!LEVELS.includes(level)) throw new Error('Nivel inválido');

  await prisma.course.update({
    where: { id },
    data: {
      title,
      description: description || null,
      coverImage: coverImage || null,
      level,
      sortOrder,
      isPublished,
      isPremium,
    },
  });
  await logAudit(admin.id, 'course.updated', `course:${id}`, { title, isPublished });
  revalidatePath('/admin/cursos');
  revalidatePath(`/admin/cursos/${id}`);
}

export async function deleteCourse(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  if (!id) throw new Error('Curso inválido');
  await prisma.course.delete({ where: { id } });
  await logAudit(admin.id, 'course.deleted', `course:${id}`);
  revalidatePath('/admin/cursos');
  redirect('/admin/cursos');
}

/* ---------------- Lecciones ---------------- */

export async function createLesson(formData: FormData) {
  const admin = await assertAdmin();
  const courseId = String(formData.get('courseId'));
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? 'VIDEO') as LessonType;
  if (!courseId || !title) throw new Error('Faltan datos de la lección');
  if (!TYPES.includes(type)) throw new Error('Tipo inválido');

  const count = await prisma.lesson.count({ where: { courseId } });

  await prisma.lesson.create({
    data: {
      courseId,
      title,
      type,
      videoUrl: String(formData.get('videoUrl') ?? '').trim() || null,
      storageKey: String(formData.get('storageKey') ?? '').trim() || null,
      contentText: String(formData.get('contentText') ?? '').trim() || null,
      durationSec: Number(formData.get('durationSec')) || null,
      isFreePreview: formData.get('isFreePreview') === 'on',
      sortOrder: count,
    },
  });
  await logAudit(admin.id, 'lesson.created', `course:${courseId}`, { title });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function updateLesson(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const courseId = String(formData.get('courseId'));
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? 'VIDEO') as LessonType;
  if (!id || !title) throw new Error('Datos inválidos');
  if (!TYPES.includes(type)) throw new Error('Tipo inválido');

  await prisma.lesson.update({
    where: { id },
    data: {
      title,
      type,
      videoUrl: String(formData.get('videoUrl') ?? '').trim() || null,
      storageKey: String(formData.get('storageKey') ?? '').trim() || null,
      contentText: String(formData.get('contentText') ?? '').trim() || null,
      durationSec: Number(formData.get('durationSec')) || null,
      sortOrder: Number(formData.get('sortOrder') ?? 0) || 0,
      isFreePreview: formData.get('isFreePreview') === 'on',
    },
  });
  await logAudit(admin.id, 'lesson.updated', `lesson:${id}`, { title });
  revalidatePath(`/admin/cursos/${courseId}`);
}

export async function deleteLesson(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get('id'));
  const courseId = String(formData.get('courseId'));
  if (!id) throw new Error('Lección inválida');
  await prisma.lesson.delete({ where: { id } });
  await logAudit(admin.id, 'lesson.deleted', `lesson:${id}`);
  revalidatePath(`/admin/cursos/${courseId}`);
}
