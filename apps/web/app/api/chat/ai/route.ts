// Endpoint seguro del chat con IA
// - Verifica sesión
// - Verifica que NO sea admin (la IA no debe asistir admins en /archivos)
// - Rate limit por usuario
// - Pasa solo contexto seguro a la IA

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { callMinimax, checkRateLimit } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // para que tenga acceso a process.env y fetch

interface FileSummary {
  id: string;
  title: string;
  brand: string;
  model: string | null;
  category: string;
  subcategory: string | null;
  tags: string[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // IMPORTANTE: Solo usuarios NO-admin pueden usar el chat
    // (admins tienen su propio panel de admin, no necesitan la IA para buscar)
    if (session.user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'El chat IA está disponible solo para usuarios estándar' },
        { status: 403 }
      );
    }

    // Rate limit
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

    // Construir catálogo resumido (sin URLs ni datos sensibles)
    // Solo pasamos: id, title, brand, model, category, subcategory, tags
    // NO pasamos: storageKey, sizeBytes, isPremium, userId, etc.
    const files = await prisma.fileItem.findMany({
      where: {
        // Solo archivos visibles (premium o no, todos son visibles)
      },
      select: {
        id: true,
        title: true,
        brand: true,
        model: true,
        category: true,
        subcategory: true,
        tags: true,
      },
      take: 500, // límite para no pasar todo
      orderBy: { downloadsCount: 'desc' },
    });

    // Agrupar por brand/category para que la IA entienda la estructura
    const context = buildContextSummary(files as FileSummary[]);

    // Historial sanitizado (sin system messages, solo user/assistant)
    const safeHistory = (history || [])
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content.substring(0, 500), // limitar longitud
      }));

    // Llamar a Minimax
    const reply = await callMinimax({
      query,
      context,
      history: safeHistory,
      userId: session.user.id,
    });

    return NextResponse.json({
      reply,
      // La IA puede mencionar archivos; devolvemos los IDs para que el cliente
      // pueda crear links a la biblioteca
    });
  } catch (e) {
    console.error('[chat/ai error]', e);
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json(
      { error: msg.includes('IA no configurada') ? msg : 'Error al procesar la consulta' },
      { status: 500 }
    );
  }
}

function buildContextSummary(files: FileSummary[]): string {
  // Agrupar por brand y category
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

  // Generar resumen legible
  const lines: string[] = [];
  for (const [brand, cats] of Object.entries(grouped).sort()) {
    lines.push(`\n## ${brand}`);
    for (const [cat, items] of Object.entries(cats).sort()) {
      lines.push(`  - ${cat}: ${items.slice(0, 30).join(', ')}${items.length > 30 ? `... (+${items.length - 30} más)` : ''}`);
    }
  }
  return lines.join('\n');
}
