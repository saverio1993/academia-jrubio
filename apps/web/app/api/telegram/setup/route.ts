import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN no está configurado en las variables de entorno de Vercel' });
  }

  const appUrl = (process.env.APP_URL ?? '').replace(/\/$/, '');
  if (!appUrl || appUrl.includes('localhost')) {
    return NextResponse.json({ ok: false, error: `APP_URL es "${appUrl}" — debe ser la URL de producción, no localhost` });
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'inline_query'] }),
  });
  const data = await res.json() as { ok: boolean; description?: string };

  if (data.ok) {
    // Activar comandos del menú del bot
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'buscar',      description: 'Busca archivos en la biblioteca' },
          { command: 'mifirmware',  description: 'Busca firmwares por modelo' },
          { command: 'start',       description: 'Mostrar ayuda' },
        ],
      }),
    });
    return NextResponse.json({ ok: true, webhookUrl });
  }

  return NextResponse.json({ ok: false, error: data.description });
}

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, configured: false });

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await res.json() as { ok: boolean; result?: { url: string; pending_update_count: number; last_error_message?: string } };

  return NextResponse.json({ ok: true, configured: true, webhook: data.result });
}
