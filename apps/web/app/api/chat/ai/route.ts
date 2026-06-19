// Endpoint seguro del chat con IA
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { callAI, checkRateLimit } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'El chat IA está disponible solo para usuarios estándar' },
        { status: 403 }
      );
    }

    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Espera un momento.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { query, history } = body;

    if (!query || typeof query !== 'string' || query.length > 500) {
      return NextResponse.json({ error: 'Query inválida' }, { status: 400 });
    }

    const files = await prisma.fileItem.findMany({
      select: {
        id: true,
        title: true,
        brand: true,
        model: true,
        category: true,
        subcategory: true,
        tags: true,
      },
      take: 500,
      orderBy: { downloadsCount: 'desc' },
    });

    const context = buildContextSummary(files);
    const safeHistory = (history || [])
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content.substring(0, 500),
      }));

    const reply = await callAI({
      query,
      context,
      history: safeHistory,
      userId: session.user.id,
    });

    return NextResponse.json({ reply });
  } catch (e) {
    console.error('[chat/ai error]', e);
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildContextSummary(files: any[]): string {
  const grouped: Record<string, Record<string, string[]>> = {};
  for (const f of files) {
    const brand = f.brand || 'Otros';
    const cat = f.category || 'sin categoría';
    if (!grouped[brand]) grouped[brand] = {};
    if (!grouped[brand][cat]) grouped[brand][cat] = [];
    const display = `${f.title}${f.model ? ` (${f.model})` : ''}`;
    if (!grouped[brand][cat].includes(display)) {
      grouped[brand][cat].push(display);
    }
  }

  const lines: string[] = [];
  for (const [brand, cats] of Object.entries(grouped).sort()) {
    lines.push(`\n## ${brand}`);
    for (const [cat, items] of Object.entries(cats).sort()) {
      lines.push(`  - ${cat}: ${items.slice(0, 30).join(', ')}${items.length > 30 ? `... (+${items.length - 30} más)` : ''}`);
    }
  }
  return lines.join('\n');
}
