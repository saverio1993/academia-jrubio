'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
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
  const basePath = process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files';

  if (!baseUrl || !username || !appPassword) {
    throw new Error('Faltan variables de Nextcloud');
  }

  // Calcula la fecha de expiración (mínimo 1 día en el futuro, Nextcloud lo requiere)
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  const expireDateStr = expiresAt.toISOString().split('T')[0];

  // Resuelve la ruta completa dentro de Nextcloud
  const cleanBase = basePath.replace(/^\/|\/$/g, '');
  const cleanKey = storageKey.replace(/^\//, '');
  const fullPath = `/${cleanBase}/${cleanKey}`;

  // Llama a la OCS API de Nextcloud
  const ocsUrl = `${baseUrl.replace(/\/$/, '')}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const body = new URLSearchParams({
    path: fullPath,
    shareType: '3', // 3 = public link
    permissions: '1', // 1 = read only
    expireDate: expireDateStr,
  });

  const res = await fetch(ocsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'OCS-APIRequest': 'true',
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Nextcloud share failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { ocs?: { data?: { url?: string } } };
  const shareUrl = json.ocs?.data?.url;
  if (!shareUrl) throw new Error('Nextcloud share API returned no URL');

  // Añade /download para forzar descarga en vez de preview
  const downloadUrl = shareUrl.endsWith('/download') ? shareUrl : `${shareUrl}/download`;

  return { url: downloadUrl, expiresAt };
}

export async function downloadFile(fileId: string, _storageKey: string, _userId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin?callbackUrl=/archivos');
  }

  const file = await prisma.fileItem.findUnique({ where: { id: fileId } });
  if (!file) throw new Error('Archivo no encontrado');

  // Verificar suscripción para archivos premium
  if (file.isPremium) {
    const hasSub = await hasActiveSubscription(session.user.id);
    if (!hasSub) redirect('/planes');
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

  // Redirigir al enlace de Nextcloud
  redirect(share.url);
}
