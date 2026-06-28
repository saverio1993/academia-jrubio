import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeenAt: new Date() },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
