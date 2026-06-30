import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import {
  IngressClient,
  IngressInput,
  IngressVideoOptions,
  IngressVideoEncodingOptions,
  IngressAudioOptions,
  IngressAudioEncodingOptions,
  VideoCodec,
  AudioCodec,
} from 'livekit-server-sdk';

const ROOM = 'academia-live';

// VideoQuality values (livekit.VideoQuality proto enum): HIGH=2, MEDIUM=1, LOW=0
const VQ = { HIGH: 2, MEDIUM: 1, LOW: 0 } as const;

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

    const ingress = await client.createIngress(IngressInput.RTMP_INPUT, {
      name:                'obs-stream',
      roomName:            ROOM,
      participantIdentity: 'obs-broadcaster',
      participantName:     'OBS',
      // Transcodificación H264 High con 3 capas: 1440p / 1080p / 720p
      video: new IngressVideoOptions({
        encodingOptions: {
          case: 'options',
          value: new IngressVideoEncodingOptions({
            videoCodec: VideoCodec.H264_HIGH,
            frameRate:  60,
            layers: [
              { quality: VQ.HIGH,   width: 2560, height: 1440, bitrate: 30_000_000 },
              { quality: VQ.MEDIUM, width: 1920, height: 1080, bitrate: 15_000_000 },
              { quality: VQ.LOW,    width: 1280, height:  720, bitrate:  5_000_000 },
            ],
          }),
        },
      }),
      audio: new IngressAudioOptions({
        encodingOptions: {
          case: 'options',
          value: new IngressAudioEncodingOptions({
            audioCodec: AudioCodec.OPUS,
            bitrate:    256_000,
            channels:   2,
          }),
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
