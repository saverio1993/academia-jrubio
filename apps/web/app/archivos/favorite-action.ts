'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { revalidatePath } from 'next/cache';

export async function toggleFavorite(fileItemId: string): Promise<{ isFav: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');

  const userId = session.user.id;
  const existing = await prisma.favorite.findUnique({
    where: { userId_fileItemId: { userId, fileItemId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { userId_fileItemId: { userId, fileItemId } } });
    revalidatePath('/favoritos');
    return { isFav: false };
  } else {
    await prisma.favorite.create({ data: { userId, fileItemId } });
    revalidatePath('/favoritos');
    return { isFav: true };
  }
}
