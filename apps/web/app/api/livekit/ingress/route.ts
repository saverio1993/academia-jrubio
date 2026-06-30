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

// VideoQuality enum no está re-exportado por livekit-server-sdk, usamos los valores numéricos
// HIGH=2, MEDIUM=1, LOW=0  (from livekit.VideoQuality protobuf enum)
const VQ_HIGH   = 2;
const VQ_MEDIUM = 1;
const VQ_LOW    = 0;

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
    // Transcodificación explícita con 3 capas de simulcast: 1440p / 1080p / 720p
    video: new IngressVideoOptions({
      encodingOptions: {
        case: 'options',
        value: new IngressVideoEncodingOptions({
          videoCodec: VideoCodec.H264_HIGH,
          frameRate:  60,
          // Los objetos planos son aceptados como PartialMessage<VideoLayer>
          layers: [
            { quality: VQ_HIGH,   width: 2560, height: 1440, bitrate: 30_000_000 },
            { quality: VQ_MEDIUM, width: 1920, height: 1080, bitrate: 15_000_000 },
            { quality: VQ_LOW,    width: 1280, height:  720, bitrate:  5_000_000 },
          ] as never[],
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
