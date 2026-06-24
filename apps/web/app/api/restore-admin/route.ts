// ENDPOINT DE EMERGENCIA — eliminar después de usar
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TOKEN = 'ajr-fix-9m4k';
const OWNER_EMAIL = 'saveriomanrrique19@gmail.com';

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t');
  if (t !== TOKEN) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN', name: 'Saverio' },
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0b;color:#fafafa">
      <h2 style="color:#f97316">✅ Cuenta restaurada</h2>
      <p>saveriomanrrique19@gmail.com → rol <strong>ADMIN</strong></p>
      <p>Ahora <a href="/admin" style="color:#f97316">entra al panel</a> o cierra sesión y vuelve a entrar con Google.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
