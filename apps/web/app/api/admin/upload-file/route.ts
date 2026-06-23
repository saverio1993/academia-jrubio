import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { getStorage } from '@academia/storage';

// Allow long-running uploads (Vercel Pro: up to 300 s)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const folder = (searchParams.get('folder') ?? '').trim().replace(/^\/|\/$/g, '');
  const rawFilename = (searchParams.get('filename') ?? 'upload').trim();
  const originalName = rawFilename.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  const storageKey = folder ? `${folder}/${originalName}` : originalName;

  const mimeType = req.headers.get('x-file-type') ?? req.headers.get('content-type') ?? undefined;
  const contentLength = Number(req.headers.get('content-length')) || undefined;

  if (!req.body) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  const storage = getStorage();
  const uploaded = await storage.upload({
    key: storageKey,
    body: req.body,   // ReadableStream — se pasa directo a Nextcloud sin buffering
    mimeType,
    contentLength,
  });

  return NextResponse.json({
    storageKey: uploaded.key,
    sizeBytes: uploaded.size ?? contentLength ?? 0,
    mimeType: mimeType ?? null,
    fileName: originalName,
  });
}
