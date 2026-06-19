import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ message: 'Escribe una consulta.', results: [] });
  }

  // Búsqueda básica en la BD (se reemplaza por RAG con IA después)
  const tokens = q.split(/\s+/).filter(Boolean);

  const files = await prisma.fileItem.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        ...tokens.map((t) => ({ title: { contains: t, mode: 'insensitive' as const } })),
      ],
    },
    take: 8,
    orderBy: { downloadsCount: 'desc' },
  });

  const results = files.map((f) => ({
    id: f.id,
    title: f.title,
    brand: f.brand,
    model: f.model,
    category: f.category,
  }));

  let message: string;
  if (results.length === 0) {
    message = `No encontré archivos para "${q}". Intenta con otro término (marca, modelo, categoría).`;
  } else if (results.length === 1) {
    message = `Encontré 1 archivo que coincide con "${q}":`;
  } else {
    message = `Encontré ${results.length} archivos que coinciden con "${q}":`;
  }

  return NextResponse.json({ message, results });
}
