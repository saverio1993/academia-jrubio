import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NEXTCLOUD_URL  = () => process.env.NEXTCLOUD_URL!.replace(/\/$/, '');
const NEXTCLOUD_USER = () => process.env.NEXTCLOUD_USER!;
const AUTH           = () => `Basic ${Buffer.from(`${NEXTCLOUD_USER()}:${process.env.NEXTCLOUD_APP_PASSWORD!}`).toString('base64')}`;
const DAV_UPLOADS    = () => `${NEXTCLOUD_URL()}/remote.php/dav/uploads/${NEXTCLOUD_USER()}`;

/**
 * PUT /api/admin/upload-chunk?uploadId=X&start=0&end=3145727
 *
 * Recibe un trozo del archivo como body binario y lo sube a la sesión
 * de chunked upload de Nextcloud. Cada trozo es <= 3 MB, dentro del
 * límite de Vercel.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'ADMIN' && user?.role !== 'MODERATOR') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const uploadId = searchParams.get('uploadId');
  const start    = searchParams.get('start');
  const end      = searchParams.get('end');

  if (!uploadId || start === null || end === null || !req.body) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  // Nextcloud chunked upload: PUT /dav/uploads/{user}/{uploadId}/{start}-{end}
  const chunkUrl = `${DAV_UPLOADS()}/${uploadId}/${start}-${end}`;
  const res = await fetch(chunkUrl, {
    method: 'PUT',
    headers: {
      Authorization: AUTH(),
      'Content-Type': 'application/octet-stream',
    },
    body: req.body,
    // @ts-ignore -- duplex requerido para streaming en Node.js 18+
    duplex: 'half',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: `Nextcloud chunk error: ${res.status} — ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
