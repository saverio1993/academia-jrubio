import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN ?? '';
const APP_URL = (process.env.APP_URL ?? 'https://academia-jrubio.vercel.app').replace(/\/$/, '');

async function sendMessage(chatId: string, text: string, extra: object = {}) {
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  });
}

// #7 — Recordatorio de vencimiento (llamado por Vercel Cron cada día a las 9am)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now  = new Date();
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in4d = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const subs = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gte: in3d, lt: in4d },
      user: { telegramId: { not: null } },
    },
    include: {
      user: { select: { telegramId: true, name: true } },
      plan: { select: { name: true } },
    },
  });

  let sent = 0;
  for (const sub of subs) {
    if (!sub.user.telegramId) continue;
    const firstName = sub.user.name?.split(' ')[0] ?? 'técnico';
    const expDate   = sub.expiresAt!.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });

    await sendMessage(sub.user.telegramId,
      `⏰ <b>Hola ${firstName}, tu suscripción vence pronto</b>\n\n` +
      `Tu plan <b>${sub.plan.name}</b> vence el <b>${expDate}</b> (en 3 días).\n\n` +
      `Renueva para no perder acceso a la biblioteca, academia y foro.`,
      { reply_markup: { inline_keyboard: [[{ text: '🔄 Renovar suscripción', url: `${APP_URL}/planes` }]] } },
    );
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
