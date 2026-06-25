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

  const tokens = q.split(/\s+/).filter(Boolean);
  // Detectar si parece número de parte (ej: ELI-NX9, SM-A556B, DNY-NX9)
  const isPartNum = /^[A-Z0-9]{2,}[-_][A-Z0-9]{2,}/i.test(q.trim());

  const [exactModel, general] = await Promise.all([
    // Coincidencia exacta de modelo (solo si parece número de parte)
    isPartNum ? prisma.fileItem.findMany({
      where: { model: { equals: q.trim(), mode: 'insensitive' } },
      take: 6,
      orderBy: { downloadsCount: 'desc' },
    }) : Promise.resolve([]),

    prisma.fileItem.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { subcategory: { contains: q, mode: 'insensitive' } },
          ...tokens.map((t) => ({ title: { contains: t, mode: 'insensitive' as const } })),
          ...tokens.map((t) => ({ model: { contains: t, mode: 'insensitive' as const } })),
        ],
      },
      take: 16,
      orderBy: { downloadsCount: 'desc' },
    }),
  ]);

  // Exact matches primero, sin duplicados
  const exactIds = new Set(exactModel.map(f => f.id));
  const merged   = [...exactModel, ...general.filter(f => !exactIds.has(f.id))].slice(0, 14);

  const results = merged.map((f) => ({
    id: f.id,
    title: f.title,
    brand: f.brand,
    model: f.model,
    category: f.category,
    storageKey: f.storageKey,
    sizeBytes: f.sizeBytes != null ? Number(f.sizeBytes) : null,
    isPremium: f.isPremium,
    exactMatch: exactIds.has(f.id),
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
