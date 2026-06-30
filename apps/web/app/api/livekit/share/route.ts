import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getStorage } from '@academia/storage';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  const key = `live/${Date.now()}-${safeName}`;

  const storage = getStorage();
  const arrayBuffer = await file.arrayBuffer();

  await storage.upload({
    key,
    body: Buffer.from(arrayBuffer),
    mimeType: file.type || undefined,
    contentLength: file.size,
  });

  // Enlace válido 24h
  const share = await storage.getShareLink(key, { expiresIn: 86400 });

  return NextResponse.json({
    url:      share.url,
    filename: safeName,
    size:     file.size,
  });
}
