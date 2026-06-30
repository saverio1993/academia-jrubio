import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description } = await req.json();

  await prisma.liveSession.updateMany({
    where: { isLive: true },
    data: { isLive: false, endedAt: new Date() },
  });

  const live = await prisma.liveSession.create({
    data: { title, description: description ?? '', isLive: true },
  });

  // Notificación Telegram
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://academia-jrubio-web-nnl3.vercel.app';
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
