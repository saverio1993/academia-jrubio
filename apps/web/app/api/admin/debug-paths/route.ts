// Endpoint de diagnóstico — solo ADMIN
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const runtime  = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'MODERATOR'].includes((session.user as { role?: string }).role ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const ncBase     = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/\/+$/, '');
  const ncUrl      = (process.env.NEXTCLOUD_URL ?? '').replace(/\/+$/, '');
  const ncUser     = process.env.NEXTCLOUD_USER ?? '';
  const ncPassword = process.env.NEXTCLOUD_APP_PASSWORD ?? '';

  const authHeader = 'Basic ' + Buffer.from(`${ncUser}:${ncPassword}`).toString('base64');

  // Tomar 3 archivos de muestra
  const sample = await prisma.fileItem.findMany({
    select: { title: true, storageKey: true },
    take: 3,
    orderBy: { storageKey: 'asc' },
  });

  // Para cada archivo, probar WebDAV HEAD y OCS API
  const tests = await Promise.all(sample.map(async (f) => {
    const fullPath = `${ncBase}/${f.storageKey}`;
    const davUrl   = `${ncUrl}/remote.php/dav/files/${ncUser}${fullPath}`;
    const ocsUrl   = `${ncUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;

    // 1. Verificar si el archivo existe vía WebDAV
    let davStatus = 0;
    let davOk = false;
    try {
      const r = await fetch(davUrl, { method: 'HEAD', headers: { Authorization: authHeader } });
      davStatus = r.status;
      davOk = r.status === 200 || r.status === 207;
    } catch (e) { davStatus = -1; }

    // 2. Intentar crear share OCS
    let ocsStatus = 0;
    let ocsMsg = '';
    try {
      const body = new URLSearchParams({
        path: fullPath, shareType: '3', permissions: '1',
      }).toString();
      const r = await fetch(ocsUrl, {
        method: 'POST',
        headers: { Authorization: authHeader, 'OCS-APIRequest': 'true', Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      ocsStatus = r.status;
      const j = await r.json() as { ocs?: { meta?: { status?: string; message?: string }; data?: { url?: string } } };
      ocsMsg = j.ocs?.meta?.message ?? j.ocs?.meta?.status ?? 'ok';
      if (j.ocs?.data?.url) ocsMsg = '✅ URL: ' + j.ocs.data.url;
    } catch (e) { ocsMsg = String(e); }

    return {
      title: f.title,
      storageKey: f.storageKey,
      fullPath,
      davUrl,
      davStatus,
      davOk,
      ocsStatus,
      ocsMsg,
    };
  }));

  return NextResponse.json({ ncUrl, ncUser, ncBase, tests });
}
