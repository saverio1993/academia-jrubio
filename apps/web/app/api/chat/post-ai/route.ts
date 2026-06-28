import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { callAI, checkRateLimit } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR') {
      const { hasActiveSubscription } = await import('@/lib/access');
      if (!(await hasActiveSubscription(session.user.id))) {
        return NextResponse.json({ error: 'Disponible solo con suscripción activa.' }, { status: 403 });
      }
    }

    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Demasiadas consultas. Espera un momento.' }, { status: 429 });
    }

    const body = await req.json() as {
      query: string;
      postTitle?: string;
      postContent?: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    const { query, postTitle, postContent, history } = body;
    if (!query || typeof query !== 'string' || query.length > 1000) {
      return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 });
    }

    const postContext = postTitle && postContent
      ? `Título del post: "${postTitle}"\n\nContenido:\n${postContent.slice(0, 2500)}`
      : '';

    const safeHistory = (history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));

    const reply = await callAI({
      query,
      context: postContext
        ? `El usuario está leyendo un post del foro con este contenido:\n\n${postContext}\n\nResponde preguntas sobre este tema. Puedes ampliar información, explicar conceptos técnicos, dar pasos adicionales o aclarar dudas. No busques archivos.`
        : '',
      history: safeHistory,
      userId: session.user.id,
    });

    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
