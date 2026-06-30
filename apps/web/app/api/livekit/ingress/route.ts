import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import {
  IngressClient,
  IngressInput,
  IngressVideoOptions,
  IngressVideoEncodingPreset,
  IngressAudioOptions,
  IngressAudioEncodingPreset,
} from 'livekit-server-sdk';

const ROOM = 'academia-live';

function lkHttpUrl() {
  return process.env.LIVEKIT_URL!.replace(/^wss?:\/\//, 'https://');
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = new IngressClient(
      lkHttpUrl(),
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    );

    // Preset oficial: 1080p60 con 3 capas simulcast (1080p / 540p / 270p)
    // LiveKit Cloud no admite resoluciones >1080p en el transcoding RTMP
    const ingress = await client.createIngress(IngressInput.RTMP_INPUT, {
      name:                'obs-stream',
      roomName:            ROOM,
      participantIdentity: 'obs-broadcaster',
      participantName:     'OBS',
      video: new IngressVideoOptions({
        encodingOptions: {
          case:  'preset',
          value: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
        },
      }),
      audio: new IngressAudioOptions({
        encodingOptions: {
          case:  'preset',
          value: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
        },
      }),
    });

    await prisma.liveSession.updateMany({
      where: { isLive: true },
      data:  { ingressId: ingress.ingressId },
    });

    return NextResponse.json({
      rtmpUrl:   ingress.url,
      streamKey: ingress.streamKey,
      ingressId: ingress.ingressId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ingress] createIngress failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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
    try {
      const client = new IngressClient(
        lkHttpUrl(),
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );
      await client.deleteIngress(active.ingressId);
    } catch {}
    await prisma.liveSession.updateMany({
      where: { isLive: true },
      data:  { ingressId: null },
    });
  }

  return NextResponse.json({ ok: true });
}
