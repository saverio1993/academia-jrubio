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

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR') {
      const { hasActiveSubscription } = await import('@/lib/access');
      const hasSub = await hasActiveSubscription(session.user.id);
      if (!hasSub) {
        return NextResponse.json(
          { error: 'El chat IA está disponible para usuarios con suscripción activa.' },
          { status: 403 },
        );
      }
    }

    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Demasiadas consultas. Espera un momento.' }, { status: 429 });
    }

    const body = await req.json();
    const { query, history } = body;

    if (!query || typeof query !== 'string' || query.length > 500) {
      return NextResponse.json({ error: 'Query inválida' }, { status: 400 });
    }

    // Catálogo completo para contexto de la IA
    const catalog = await prisma.fileItem.findMany({
      select: { id: true, title: true, brand: true, model: true, category: true, subcategory: true, tags: true },
      take: 500,
      orderBy: { downloadsCount: 'desc' },
    });

    // Filtrar stopwords en español para mejorar búsqueda
    const STOPWORDS = new Set(['el','la','los','las','un','una','del','de','en','con','para','por','que','es','se','al','su','sus','dame','busca','quiero','necesito','como','hay','tiene','hay','me','mi']);
    const keywords = query
      .split(/\s+/)
      .map(k => k.replace(/[¿?¡!.,;:]/g, '').toLowerCase())
      .filter(k => k.length > 1 && !STOPWORDS.has(k));

    // Búsqueda paralela: archivos + posts del foro
    const fileOrClause = [
      { title:      { contains: query, mode: 'insensitive' as const } },
      { brand:      { contains: query, mode: 'insensitive' as const } },
      { model:      { contains: query, mode: 'insensitive' as const } },
      { storageKey: { contains: query, mode: 'insensitive' as const } },
      ...keywords.map((k) => ({ title:    { contains: k, mode: 'insensitive' as const } })),
      ...keywords.map((k) => ({ model:    { contains: k, mode: 'insensitive' as const } })),
      ...keywords.map((k) => ({ brand:    { contains: k, mode: 'insensitive' as const } })),
      ...keywords.map((k) => ({ category: { contains: k, mode: 'insensitive' as const } })),
      ...keywords.map((k) => ({ storageKey: { contains: k, mode: 'insensitive' as const } })),
    ];

    const postOrClause = [
      { title:   { contains: query, mode: 'insensitive' as const } },
      { content: { contains: query, mode: 'insensitive' as const } },
      ...keywords.map((k) => ({ title:   { contains: k, mode: 'insensitive' as const } })),
      ...keywords.map((k) => ({ content: { contains: k, mode: 'insensitive' as const } })),
    ];

    const [matchingFiles, matchingPosts] = await Promise.all([
      prisma.fileItem.findMany({
        where: { OR: fileOrClause },
        select: { id: true, title: true, brand: true, model: true, category: true, storageKey: true, sizeBytes: true, isPremium: true },
        take: 6,
        orderBy: { downloadsCount: 'desc' },
      }),
      prisma.post.findMany({
        where: { status: 'PUBLISHED', OR: postOrClause },
        select: {
          slug: true, title: true, category: true, views: true,
          author: { select: { name: true, email: true } },
          _count: { select: { comments: true } },
          comments: { where: { isSolution: true }, select: { id: true }, take: 1 },
        },
        take: 4,
        orderBy: { views: 'desc' },
      }),
    ]);

    const fileContext = buildContextSummary(catalog);
    const postContext = matchingPosts.length > 0
      ? `\n\n## Posts del foro relacionados\n${matchingPosts.map(p => `- "${p.title}" [${p.category}]${p.comments.length > 0 ? ' ✅ Resuelto' : ''}`).join('\n')}`
      : '';

    const safeHistory = (history || [])
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content.substring(0, 500),
      }));

    const reply = await callAI({ query, context: fileContext + postContext, history: safeHistory, userId: session.user.id });

    // Si la búsqueda de archivos no encontró nada, reintenta con palabras de la respuesta IA
    let finalFiles = matchingFiles;
    if (finalFiles.length === 0 && reply.length > 10) {
      const replyKeywords = reply
        .split(/\s+/)
        .map(k => k.replace(/[*_`"'«»¿?¡!.,;:()\[\]]/g, '').toLowerCase())
        .filter(k => k.length > 3 && !STOPWORDS.has(k))
        .slice(0, 10);

      if (replyKeywords.length > 0) {
        finalFiles = await prisma.fileItem.findMany({
          where: {
            OR: [
              ...replyKeywords.map(k => ({ title:      { contains: k, mode: 'insensitive' as const } })),
              ...replyKeywords.map(k => ({ model:      { contains: k, mode: 'insensitive' as const } })),
              ...replyKeywords.map(k => ({ brand:      { contains: k, mode: 'insensitive' as const } })),
              ...replyKeywords.map(k => ({ storageKey: { contains: k, mode: 'insensitive' as const } })),
            ],
          },
          select: { id: true, title: true, brand: true, model: true, category: true, storageKey: true, sizeBytes: true, isPremium: true },
          take: 6,
          orderBy: { downloadsCount: 'desc' },
        });
      }
    }

    const files = finalFiles.map((f) => ({
      ...f,
      sizeBytes: f.sizeBytes != null ? Number(f.sizeBytes) : null,
    }));

    const posts = matchingPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      category: p.category,
      authorName: p.author.name ?? p.author.email?.split('@')[0] ?? '',
      commentsCount: p._count.comments,
      isResolved: p.comments.length > 0,
    }));

    return NextResponse.json({ reply, files, posts });
  } catch (e) {
    console.error('[chat/ai error]', e);
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildContextSummary(files: { brand: string; category: string; title: string; model: string | null }[]): string {
  const grouped: Record<string, Record<string, string[]>> = {};
  for (const f of files) {
    const brand = f.brand || 'Otros';
    const cat   = f.category || 'sin categoría';
    if (!grouped[brand])      grouped[brand] = {};
    if (!grouped[brand][cat]) grouped[brand][cat] = [];
    const display = `${f.title}${f.model ? ` (${f.model})` : ''}`;
    if (!grouped[brand][cat].includes(display)) grouped[brand][cat].push(display);
  }
  const lines: string[] = [];
  for (const [brand, cats] of Object.entries(grouped).sort()) {
    lines.push(`\n## ${brand}`);
    for (const [cat, items] of Object.entries(cats).sort()) {
      lines.push(`  - ${cat}: ${items.slice(0, 30).join(', ')}${items.length > 30 ? ` (+${items.length - 30} más)` : ''}`);
    }
  }
  return lines.join('\n');
}
