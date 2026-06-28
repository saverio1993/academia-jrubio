'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { redirect } from 'next/navigation';
import { CategoryKey } from './categories';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .slice(0, 80);
}

export async function updatePost(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  const post = await prisma.post.findUnique({ where: { slug }, select: { id: true, authorId: true } });
  if (!post) throw new Error('Post no encontrado');
  if (!isAdmin && post.authorId !== userId) throw new Error('Sin permiso para editar');

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const content = (formData.get('content') as string | null)?.trim() ?? '';
  const category = (formData.get('category') as string | null)?.trim() ?? 'general';

  if (!title || title.length < 5) throw new Error('El título es demasiado corto');
  if (!content || content.length < 20) throw new Error('El contenido es demasiado corto');

  await prisma.post.update({
    where: { id: post.id },
    data: { title, content, category: category as CategoryKey },
  });

  redirect(`/comunidad/${slug}`);
}

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/comunidad/crear');

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = isAdmin || (await hasActiveSubscription(userId));

  if (!hasSub) {
    throw new Error('Necesitas suscripción activa para publicar');
  }

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const content = (formData.get('content') as string | null)?.trim() ?? '';
  const category = (formData.get('category') as string | null)?.trim() ?? 'general';

  if (!title || title.length < 5) throw new Error('El título es demasiado corto');
  if (!content || content.length < 20) throw new Error('El contenido es demasiado corto');

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Parse attachments JSON (optional)
  let attachments: Array<{
    storageKey: string; publicUrl: string; fileName: string;
    mimeType?: string; sizeBytes?: number;
  }> = [];
  try {
    const raw = formData.get('attachments') as string | null;
    if (raw) attachments = JSON.parse(raw);
  } catch { /* ignore */ }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      category: category as CategoryKey,
      authorId: userId,
      status: 'PUBLISHED',
      attachments: attachments.length > 0 ? {
        create: attachments.map((a) => ({
          fileName: a.fileName,
          mimeType: a.mimeType ?? null,
          sizeBytes: a.sizeBytes ? BigInt(a.sizeBytes) : null,
          storageKey: a.storageKey,
          publicUrl: a.publicUrl,
        })),
      } : undefined,
    },
  });

  redirect(`/comunidad/${post.slug}`);
}
