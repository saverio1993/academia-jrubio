// ENDPOINT DE EMERGENCIA — restaura ADMIN al dueño de la cuenta
// Eliminar este archivo una vez usado.
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OWNER_EMAIL = 'saveriomanrrique19@gmail.com';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Debes estar logueado' }, { status: 401 });
  }
  if (session.user.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN', name: 'Saverio' },
  });

  return NextResponse.json({ ok: true, message: 'Tu cuenta fue restaurada a ADMIN. Cierra sesión y vuelve a entrar.' });
}
