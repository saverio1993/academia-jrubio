'use server';

import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { redirect } from 'next/navigation';

export async function getFiles(formData: FormData) {
  const q = formData.get('q') as string | null;
  const brand = formData.get('brand') as string | null;
  const category = formData.get('category') as string | null;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (brand) params.set('brand', brand);
  if (category) params.set('category', category);

  redirect(`/archivos?${params.toString()}`);
}
