import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let title: string, description: string;
  try {
    ({ title, description } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  let live;
  try {
    await prisma.liveSession.updateMany({
      where: { isLive: true },
      data: { isLive: false, endedAt: new Date() },
    });

    live = await prisma.liveSession.create({
      data: { title, description: description ?? '', isLive: true },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[livekit/start] db error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Notificación Telegram
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://academia-jrubio-web.vercel.app';
  if (token && chatId) {
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📡 <b>¡Live iniciado!</b>\n\n<b>${title}</b>\n\nMíralo en: ${appUrl}/live`,
        parse_mode: 'HTML',
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, id: live.id });
}
