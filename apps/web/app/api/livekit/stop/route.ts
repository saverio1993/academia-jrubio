import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.liveSession.updateMany({
    where: { isLive: true },
    data: { isLive: false, endedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
