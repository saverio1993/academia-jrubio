'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';

interface NextcloudShareResult {
  url: string;
  expiresAt: Date;
}

async function createNextcloudShare(storageKey: string): Promise<NextcloudShareResult> {
  const baseUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USER;
  const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;

  if (!baseUrl || !username || !appPassword) {
    throw new Error('Faltan variables de Nextcloud');
  }

  // Calcula la fecha de expiración (mínimo 1 día en el futuro, Nextcloud lo requiere)
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  const expireDateStr = expiresAt.toISOString().split('T')[0] ?? '';

  // Construir el path absoluto en Nextcloud
  // Los archivos sincronizados tienen storageKey relativo a NEXTCLOUD_BASE_PATH
  // Los legacy pueden tener paths absolutos empezando con '/'
  let fullPath: string;
  if (storageKey.startsWith('/')) {
    fullPath = storageKey;
  } else {
    const ncBase = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/\/+$/, '');
    fullPath = ncBase + '/' + storageKey;
  }

  // Llama a la OCS API de Nextcloud
  const ocsUrl = `${baseUrl.replace(/\/$/, '')}/ocs/v2.php/apps/files_sharing/api/v1/shares`;

  // En runtime de Vercel/Edge, Buffer puede no estar disponible; usamos btoa manual
  const credentials = `${username}:${appPassword}`;
  const auth = typeof Buffer !== 'undefined'
    ? Buffer.from(credentials).toString('base64')
    : btoa(credentials);

  const body = new URLSearchParams({
    path: fullPath,
    shareType: '3', // 3 = public link
    permissions: '1', // 1 = read only
    expireDate: expireDateStr,
  }).toString();

  console.log('[getDownloadUrl] Calling OCS API with path:', fullPath);

  const res = await fetch(ocsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'OCS-APIRequest': 'true',
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[getDownloadUrl] OCS error:', res.status, text.substring(0, 500));
    throw new Error(`Nextcloud ${res.status}: ${text.substring(0, 200)}`);
  }

  const json = (await res.json()) as { ocs?: { meta?: { status?: string; message?: string }; data?: { url?: string } } };

  // OCS API devuelve meta.status. Si es "failure", leer el mensaje
  if (json.ocs?.meta?.status === 'failure') {
    const msg = json.ocs.meta.message || 'Error desconocido';
    console.error('[getDownloadUrl] OCS meta failure:', msg);
    throw new Error(`Nextcloud: ${msg}`);
  }

  const shareUrl = json.ocs?.data?.url;
  if (!shareUrl) {
    console.error('[getDownloadUrl] No URL in response:', JSON.stringify(json).substring(0, 500));
    throw new Error('Nextcloud no devolvió URL');
  }

  // Añade /download para forzar descarga en vez de preview
  const downloadUrl = shareUrl.endsWith('/download') ? shareUrl : `${shareUrl}/download`;

  console.log('[getDownloadUrl] Got download URL:', downloadUrl.substring(0, 100));

  return { url: downloadUrl, expiresAt };
}

/**
 * Devuelve la URL de descarga. NO hace redirect, porque en Next.js
 * los redirects en Server Actions llamadas desde Client Components no funcionan.
 * El cliente hace window.location.href con la URL devuelta.
 */
export async function getDownloadUrl(
  fileId: string,
): Promise<{ url: string; expiresAt: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const file = await prisma.fileItem.findUnique({ where: { id: fileId } });
  if (!file) throw new Error('Archivo no encontrado');

  // Admins y moderadores tienen acceso completo
  const role = (session.user as { role?: string }).role;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  // Verificar suscripción para archivos premium (solo usuarios normales)
  if (file.isPremium && !isAdmin) {
    const hasSub = await hasActiveSubscription(session.user.id);
    if (!hasSub) throw new Error('NO_SUBSCRIPTION');
  }

  // Generar enlace de descarga desde Nextcloud
  const share = await createNextcloudShare(file.storageKey);

  // Registrar descarga
  await Promise.all([
    prisma.fileItem.update({
      where: { id: fileId },
      data: { downloadsCount: { increment: 1 } },
    }),
    prisma.download.create({
      data: { fileId, userId: session.user.id, ip: 'web' },
    }),
  ]);

  return { url: share.url, expiresAt: share.expiresAt.toISOString() };
}
