// ENDPOINT DE EMERGENCIA — restaura rol ADMIN por email + contraseña de Nextcloud
// Eliminar este archivo una vez usado.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { email, secret } = await req.json().catch(() => ({}));

  // Verificar secreto (usa la contraseña de Nextcloud como clave de emergencia)
  const expected = process.env.NEXTCLOUD_APP_PASSWORD;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Secreto incorrecto' }, { status: 403 });
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN', name: user.name?.toLowerCase() === 'duberney' ? null : user.name },
  });

  return NextResponse.json({ ok: true, message: `${email} restaurado a ADMIN`, prevRole: user.role });
}
