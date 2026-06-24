'use server';

import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';

interface NextcloudShareResult {
  url: string;
  expiresAt: Date;
  id: string;
}

async function createNextcloudFolderShare(folderPath: string): Promise<NextcloudShareResult> {
  const baseUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USER;
  const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;

  if (!baseUrl || !username || !appPassword) {
    throw new Error('Faltan variables de Nextcloud');
  }

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  const expireDateStr = expiresAt.toISOString().split('T')[0] ?? '';

  const ocsUrl = `${baseUrl.replace(/\/$/, '')}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
  const credentials = `${username}:${appPassword}`;
  const auth = typeof Buffer !== 'undefined'
    ? Buffer.from(credentials).toString('base64')
    : btoa(credentials);

  // Crear share público de tipo carpeta (read-only)
  const body = new URLSearchParams({
    path: folderPath,
    shareType: '3', // 3 = public link
    permissions: '1', // 1 = read only
    expireDate: expireDateStr,
  }).toString();

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
    throw new Error(`Nextcloud ${res.status}: ${text.substring(0, 200)}`);
  }

  const json = (await res.json()) as {
    ocs?: { meta?: { status?: string; message?: string }; data?: { id?: string; url?: string; token?: string } };
  };

  if (json.ocs?.meta?.status === 'failure') {
    throw new Error(`Nextcloud: ${json.ocs.meta.message}`);
  }

  const shareUrl = json.ocs?.data?.url;
  const shareToken = json.ocs?.data?.token;
  const shareId = json.ocs?.data?.id;
  if (!shareUrl) {
    throw new Error('No se pudo crear el share de la carpeta');
  }

  return { url: shareUrl, expiresAt, id: shareId || '' };
}

type FolderResult =
  | { ok: true;  url: string; expiresAt: string }
  | { ok: false; code: 'NOT_AUTHENTICATED' | 'NO_SUBSCRIPTION' | 'ERROR'; message: string };

export async function downloadFolderZip(folderPath: string): Promise<FolderResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, code: 'NOT_AUTHENTICATED', message: 'Debes iniciar sesión' };
    }

    const role    = (session.user as { role?: string }).role;
    const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

    if (!isAdmin) {
      const hasSub = await hasActiveSubscription(session.user.id);
      if (!hasSub) return { ok: false, code: 'NO_SUBSCRIPTION', message: 'Descarga de carpetas requiere suscripción' };
    }

    const ncBase        = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio').replace(/\/+$/, '');
    const absoluteFolder = folderPath.startsWith('/') ? folderPath : `${ncBase}/${folderPath}`;
    const share          = await createNextcloudFolderShare(absoluteFolder);
    const downloadUrl    = share.url.endsWith('/') ? `${share.url}download` : `${share.url}/download`;

    return { ok: true, url: downloadUrl, expiresAt: share.expiresAt.toISOString() };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    console.error('[downloadFolderZip]', message);
    return { ok: false, code: 'ERROR', message };
  }
}
