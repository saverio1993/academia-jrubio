import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { IngressClient, IngressInput } from 'livekit-server-sdk';

const ROOM = 'academia-live';

function lkHttpUrl() {
  return process.env.LIVEKIT_URL!.replace(/^wss?:\/\//, 'https://');
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = new IngressClient(
    lkHttpUrl(),
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );

  const ingress = await client.createIngress(IngressInput.RTMP_INPUT, {
    name:                'obs-stream',
    roomName:            ROOM,
    participantIdentity: 'obs-broadcaster',
    participantName:     'OBS',
    bypassTranscoding:   true, // No re-encodificar, pasar el stream de OBS tal cual
  });

  // Guardar ingressId en la sesión activa
  await prisma.liveSession.updateMany({
    where: { isLive: true },
    data:  { ingressId: ingress.ingressId },
  });

  return NextResponse.json({
    rtmpUrl:   ingress.url,
    streamKey: ingress.streamKey,
    ingressId: ingress.ingressId,
  });
}

export async function DELETE() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const active = await prisma.liveSession.findFirst({
    where:  { isLive: true },
    select: { ingressId: true },
  });

  if (active?.ingressId) {
    const client = new IngressClient(
      lkHttpUrl(),
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    );
    await client.deleteIngress(active.ingressId).catch(() => null);
    await prisma.liveSession.updateMany({
      where: { isLive: true },
      data:  { ingressId: null },
    });
  }

  return NextResponse.json({ ok: true });
}
