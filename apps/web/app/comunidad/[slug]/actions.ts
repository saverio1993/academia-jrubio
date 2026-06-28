'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { revalidatePath } from 'next/cache';
import { recalculateReputation } from '@/lib/reputation';

async function assertCanPost(slug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Debes iniciar sesión');

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = isAdmin || (await hasActiveSubscription(userId));

  if (!hasSub) throw new Error('Necesitas suscripción activa');

  const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, status: true, authorId: true } });
  if (!post) throw new Error('Post no encontrado');
  if (post.status === 'CLOSED' && !isAdmin) throw new Error('Este tema está cerrado');

  return { userId, isAdmin, postId: post.id, postAuthorId: post.authorId };
}

export async function addComment(slug: string, content: string, parentId?: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 2) throw new Error('Comentario demasiado corto');
  if (trimmed.length > 3000) throw new Error('Comentario demasiado largo');

  const { userId, postId } = await assertCanPost(slug);

  await prisma.postComment.create({
    data: { content: trimmed, authorId: userId, postId, parentId: parentId ?? null },
  });

  revalidatePath(`/comunidad/${slug}`);
}

export async function deleteComment(slug: string, commentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  const comment = await prisma.postComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!comment) throw new Error('Comentario no encontrado');
  if (!isAdmin && comment.authorId !== userId) throw new Error('Sin permiso');

  await prisma.postComment.delete({ where: { id: commentId } });
  revalidatePath(`/comunidad/${slug}`);
}

export async function toggleReaction(slug: string, type: 'like' | 'heart' | 'fire') {
  const { userId, postId, postAuthorId } = await assertCanPost(slug);

  const existing = await prisma.postReaction.findUnique({
    where: { postId_userId_type: { postId, userId, type } },
    select: { id: true },
  });

  if (existing) {
    await prisma.postReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.postReaction.create({ data: { postId, userId, type } });
  }

  recalculateReputation(postAuthorId).catch(() => {});
  revalidatePath(`/comunidad/${slug}`);
}

export async function markAsSolution(slug: string, commentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, authorId: true } });
  if (!post) throw new Error('Post no encontrado');
  if (!isAdmin && post.authorId !== userId) throw new Error('Sin permiso');

  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { isSolution: true, postId: true, authorId: true },
  });
  if (!comment || comment.postId !== post.id) throw new Error('Comentario no encontrado');

  if (comment.isSolution) {
    await prisma.postComment.update({ where: { id: commentId }, data: { isSolution: false } });
  } else {
    await prisma.$transaction([
      prisma.postComment.updateMany({ where: { postId: post.id, isSolution: true }, data: { isSolution: false } }),
      prisma.postComment.update({ where: { id: commentId }, data: { isSolution: true } }),
    ]);
  }

  recalculateReputation(comment.authorId).catch(() => {});
  revalidatePath(`/comunidad/${slug}`);
  revalidatePath('/comunidad');
}

export async function incrementViews(slug: string) {
  await prisma.post.update({
    where: { slug },
    data: { views: { increment: 1 } },
  });
}
