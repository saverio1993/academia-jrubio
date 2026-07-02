import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

function signToken(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  if (!session?.user?.id || !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const secret = process.env.VIDEO_TOOL_SECRET;
  const toolUrl = process.env.VIDEO_TOOL_URL;
  if (!secret || !toolUrl) {
    return NextResponse.json(
      { error: 'Herramienta no configurada (falta VIDEO_TOOL_SECRET o VIDEO_TOOL_URL)' },
      { status: 503 },
    );
  }

  const token = signToken({ sub: session.user.id, role }, secret, 60);
  const baseUrl = /^https?:\/\//i.test(toolUrl) ? toolUrl : `https://${toolUrl}`;
  const redirectUrl = `${baseUrl.replace(/\/$/, '')}/?token=${token}`;
  return NextResponse.redirect(redirectUrl);
}
