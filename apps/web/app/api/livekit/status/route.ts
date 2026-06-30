import { NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const live = await prisma.liveSession.findFirst({
    where: { isLive: true },
    select: { title: true },
  });

  return NextResponse.json({
    isLive: Boolean(live),
    title: live?.title ?? null,
  });
}
