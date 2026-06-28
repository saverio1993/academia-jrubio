'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';

async function assertAdmin() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (role !== 'ADMIN' && role !== 'MODERATOR') throw new Error('Sin permiso');
  return session!.user!.id!;
}

export async function pinPost(postId: string, pinned: boolean) {
  await assertAdmin();
  await prisma.post.update({ where: { id: postId }, data: { pinned } });
  revalidatePath('/comunidad');
  revalidatePath('/admin/comunidad');
}

export async function setPostStatus(postId: string, status: 'PUBLISHED' | 'CLOSED' | 'DRAFT') {
  await assertAdmin();
  await prisma.post.update({ where: { id: postId }, data: { status } });
  revalidatePath('/comunidad');
  revalidatePath('/admin/comunidad');
}

export async function deletePost(postId: string) {
  await assertAdmin();
  await prisma.post.delete({ where: { id: postId } });
  revalidatePath('/comunidad');
  revalidatePath('/admin/comunidad');
}

export async function deleteAdminComment(commentId: string) {
  await assertAdmin();
  await prisma.postComment.delete({ where: { id: commentId } });
  revalidatePath('/comunidad');
  revalidatePath('/admin/comunidad');
}
