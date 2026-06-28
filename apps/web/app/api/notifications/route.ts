import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select:  { id: true, title: true, body: true, read: true, fileItemId: true, postSlug: true, createdAt: true },
  });

  const unread = notifications.filter(n => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id, all } = await req.json() as { id?: string; all?: boolean };

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data:  { read: true },
    });
  } else if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data:  { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
