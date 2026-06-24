import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const NEXTCLOUD_URL  = () => process.env.NEXTCLOUD_URL!.replace(/\/$/, '');
const NEXTCLOUD_USER = () => process.env.NEXTCLOUD_USER!;
const NEXTCLOUD_BASE = () => (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/^\/|\/$/g, '');
const AUTH           = () => `Basic ${Buffer.from(`${NEXTCLOUD_USER()}:${process.env.NEXTCLOUD_APP_PASSWORD!}`).toString('base64')}`;
const DAV_FILES      = () => `${NEXTCLOUD_URL()}/remote.php/dav/files/${NEXTCLOUD_USER()}`;
const DAV_UPLOADS    = () => `${NEXTCLOUD_URL()}/remote.php/dav/uploads/${NEXTCLOUD_USER()}`;

/**
 * GET /api/admin/upload-creds?folder=Samsung/A55/Firmware&filename=archivo.zip
 *
 * 1. Crea la carpeta destino en Nextcloud (MKCOL recursivo)
 * 2. Crea la sesión de chunked upload (MKCOL en /dav/uploads/)
 * 3. Devuelve { uploadId, storageKey } al cliente
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'ADMIN' && user?.role !== 'MODERATOR') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const folder      = (searchParams.get('folder') ?? '').trim().replace(/^\/|\/$/g, '');
  const rawFilename = (searchParams.get('filename') ?? 'upload').trim();
  const originalName = rawFilename.replace(/[^a-zA-Z0-9._\-() ]/g, '_');
  const storageKey  = folder ? `${folder}/${originalName}` : originalName;

  const auth64 = AUTH().replace('Basic ', '');
  const authHeader = `Basic ${auth64}`;

  // ── 1. Crear carpeta destino ─────────────────────────────────────────────
  const destDir = `${NEXTCLOUD_BASE()}${folder ? `/${folder}` : ''}`;
  const parts   = destDir.split('/').filter(Boolean);
  let current   = '';
  for (const part of parts) {
    current += `/${part}`;
    await fetch(`${DAV_FILES()}${current}`, {
      method: 'MKCOL',
      headers: { Authorization: authHeader },
    }); // 201 = creada, 405 = ya existe — ambas OK
  }

  // ── 2. Crear sesión de chunked upload en Nextcloud ───────────────────────
  const uploadId = randomUUID();
  const mkcolRes = await fetch(`${DAV_UPLOADS()}/${uploadId}`, {
    method: 'MKCOL',
    headers: { Authorization: authHeader },
  });

  if (!mkcolRes.ok && mkcolRes.status !== 405) {
    return NextResponse.json(
      { error: `No se pudo crear la sesión de upload: ${mkcolRes.status}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ uploadId, storageKey });
}
