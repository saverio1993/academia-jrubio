import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { auth } from '@/auth';

const ROOM = 'academia-live';

export async function GET(req: NextRequest) {
  const role = new URL(req.url).searchParams.get('role') ?? 'viewer';

  if (role === 'broadcaster') {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: role === 'broadcaster'
        ? 'admin'
        : `viewer-${crypto.randomUUID().slice(0, 8)}`,
    }
  );

  at.addGrant({
    roomJoin: true,
    room: ROOM,
    canPublish: role === 'broadcaster',
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    token: await at.toJwt(),
    url: process.env.LIVEKIT_URL,
  });
}
