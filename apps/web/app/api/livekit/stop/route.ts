import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { IngressClient } from 'livekit-server-sdk';

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar sesión activa para ver si hay un ingress que borrar
  const active = await prisma.liveSession.findFirst({
    where:  { isLive: true },
    select: { ingressId: true },
  });

  if (active?.ingressId) {
    const client = new IngressClient(
      process.env.LIVEKIT_URL!.replace(/^wss?:\/\//, 'https://'),
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    );
    await client.deleteIngress(active.ingressId).catch(() => null);
  }

  await prisma.liveSession.updateMany({
    where: { isLive: true },
    data:  { isLive: false, endedAt: new Date(), ingressId: null },
  });

  return NextResponse.json({ ok: true });
}
