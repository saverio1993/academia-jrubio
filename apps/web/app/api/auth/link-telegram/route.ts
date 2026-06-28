import { NextResponse } from 'next/server';
import { prisma } from '@academia/db';
import { verifyPassword } from '@/lib/password';
import { validateTelegramInitData } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { initData, email, password } = await req.json() as {
      initData: string;
      email: string;
      password: string;
    };

    const tgUser = validateTelegramInitData(initData);
    if (!tgUser) {
      return NextResponse.json({ error: 'Datos de Telegram inválidos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, passwordHash: true },
    });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const existing = await prisma.user.findUnique({
      where: { telegramId: String(tgUser.id) },
      select: { id: true },
    });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: 'Esta cuenta de Telegram ya está vinculada a otro usuario' },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramId: String(tgUser.id),
        telegramHandle: tgUser.username ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[link-telegram]', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
