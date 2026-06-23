import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NEXTCLOUD_URL  = () => process.env.NEXTCLOUD_URL!.replace(/\/$/, '');
const NEXTCLOUD_USER = () => process.env.NEXTCLOUD_USER!;
const NEXTCLOUD_BASE = () => (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/^\/|\/$/g, '');
const AUTH           = () => `Basic ${Buffer.from(`${NEXTCLOUD_USER()}:${process.env.NEXTCLOUD_APP_PASSWORD!}`).toString('base64')}`;
const DAV_UPLOADS    = () => `${NEXTCLOUD_URL()}/remote.php/dav/uploads/${NEXTCLOUD_USER()}`;
const DAV_FILES      = () => `${NEXTCLOUD_URL()}/remote.php/dav/files/${NEXTCLOUD_USER()}`;

/**
 * POST /api/admin/finalize-upload
 * Body: { uploadId, storageKey, totalSize }
 *
 * Envía el MOVE de Nextcloud para ensamblar los chunks en el archivo final.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const { uploadId, storageKey, totalSize } = await req.json();
  if (!uploadId || !storageKey) {
    return NextResponse.json({ error: 'uploadId y storageKey son requeridos' }, { status: 400 });
  }

  const sourceUrl = `${DAV_UPLOADS()}/${uploadId}/.file`;
  const destUrl   = `${DAV_FILES()}/${NEXTCLOUD_BASE()}/${storageKey}`;

  const res = await fetch(sourceUrl, {
    method: 'MOVE',
    headers: {
      Authorization: AUTH(),
      Destination: destUrl,
      'OC-Total-Length': String(totalSize ?? 0),
      Overwrite: 'T',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: `Nextcloud finalize error: ${res.status} — ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storageKey });
}
