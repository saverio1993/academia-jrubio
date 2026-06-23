import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { getStorage } from '@academia/storage';

export async function POST(req: NextRequest) {
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

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = String(formData.get('folder') ?? '').trim().replace(/^\/|\/$/g, '');

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  const originalName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  const storageKey = folder ? `${folder}/${originalName}` : originalName;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();
  const uploaded = await storage.upload({
    key: storageKey,
    body: buffer,
    mimeType: file.type || undefined,
  });

  return NextResponse.json({
    storageKey: uploaded.key,
    sizeBytes: uploaded.size,
    mimeType: file.type || null,
    fileName: originalName,
  });
}
