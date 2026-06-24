// Endpoint temporal de diagnóstico — solo ADMIN
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as { role?: string }).role ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const sample = await prisma.fileItem.findMany({
    select: { id: true, title: true, storageKey: true },
    take: 20,
    orderBy: { storageKey: 'asc' },
  });

  const ncBase = process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio';
  const ncUrl  = process.env.NEXTCLOUD_URL ?? '(no configurado)';
  const ncUser = process.env.NEXTCLOUD_USER ?? '(no configurado)';

  const paths = sample.map(f => ({
    title: f.title,
    storageKey: f.storageKey,
    rutaQueSeEnvia: `${ncBase}/${f.storageKey}`,
  }));

  return NextResponse.json({ ncUrl, ncUser, ncBase, paths });
}
