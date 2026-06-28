import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { getStorage } from '@academia/storage';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  'text/plain',
];

function sanitizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._\-() ]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

async function createNextcloudShare(storageKey: string): Promise<string> {
  const baseUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USER;
  const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;
  const ncBase = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/\/+$/, '');

  if (!baseUrl || !username || !appPassword) throw new Error('Faltan vars de Nextcloud');

  const fullPath = `${ncBase}/${storageKey}`;

  // 5 años de expiración (efectivamente permanente)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 5);
  const expireDateStr = expiresAt.toISOString().split('T')[0]!;

  const ocsUrl = `${baseUrl.replace(/\/$/, '')}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
  const creds = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const body = new URLSearchParams({
    path: fullPath,
    shareType: '3',
    permissions: '1',
    expireDate: expireDateStr,
  });

  const res = await fetch(ocsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'OCS-APIRequest': 'true',
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`OCS ${res.status}`);

  const json = (await res.json()) as { ocs?: { data?: { url?: string } } };
  const url = json.ocs?.data?.url;
  if (!url) throw new Error('Nextcloud no devolvió URL del share');

  // Para imágenes queremos la URL de preview, no de descarga
  return url.endsWith('/download') ? url.slice(0, -9) : url;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = isAdmin || (await hasActiveSubscription(userId));

  if (!hasSub) {
    return NextResponse.json({ error: 'Necesitas suscripción activa' }, { status: 403 });
  }

  const fileName = sanitizeName(req.nextUrl.searchParams.get('filename') ?? 'archivo');
  const mimeType = req.headers.get('content-type')?.split(';')[0]?.trim() ?? 'application/octet-stream';
  const contentLength = Number(req.headers.get('content-length') ?? '0') || undefined;

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: `Tipo de archivo no permitido: ${mimeType}` }, { status: 400 });
  }

  if (!req.body) {
    return NextResponse.json({ error: 'Sin cuerpo de petición' }, { status: 400 });
  }

  const timestamp = Date.now();
  const storageKey = `comunidad/adjuntos/${timestamp}-${fileName}`;

  const storage = getStorage();
  const uploaded = await storage.upload({
    key: storageKey,
    body: req.body,
    mimeType,
    contentLength,
  });

  const publicUrl = await createNextcloudShare(storageKey);

  return NextResponse.json({
    storageKey: uploaded.key,
    publicUrl,
    fileName,
    mimeType,
    sizeBytes: uploaded.size ?? contentLength ?? 0,
  });
}
