'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { NextcloudAdapter } from '@academia/storage';

function getStorage() {
  const baseUrl = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USER;
  const appPassword = process.env.NEXTCLOUD_APP_PASSWORD;
  const basePath = process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files';

  if (!baseUrl || !username || !appPassword) {
    throw new Error('Faltan variables de Nextcloud');
  }

  return new NextcloudAdapter({ baseUrl, username, appPassword, basePath });
}

export async function downloadFile(fileId: string, storageKey: string, userId: string) {
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
  const storage = getStorage();
  const share = await storage.getShareLink(file.storageKey, { expiresIn: 86_400 }); // 24h

  // Registrar descarga
  const ip = 'unknown'; // En serverless no tenemos IP real fácilmente
  await Promise.all([
    prisma.fileItem.update({
      where: { id: fileId },
      data: { downloadsCount: { increment: 1 } },
    }),
    prisma.download.create({
      data: { fileId, userId: session.user.id, ip },
    }),
  ]);

  // Redirigir al enlace de Nextcloud
  redirect(share.url);
}
