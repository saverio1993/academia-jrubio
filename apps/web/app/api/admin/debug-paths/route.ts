// Endpoint de diagnóstico — solo ADMIN
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROPFIND_BODY = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/><d:getcontentlength/></d:prop></d:propfind>`;

async function listDav(url: string, authHeader: string): Promise<string[]> {
  try {
    const r = await fetch(url, {
      method: 'PROPFIND',
      headers: { Authorization: authHeader, Depth: '1', 'Content-Type': 'application/xml' },
      body: PROPFIND_BODY,
    });
    const text = await r.text();
    const names: string[] = [];
    const re = /<d:href>(.*?)<\/d:href>/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      names.push(decodeURIComponent(m[1]));
    }
    return [`status:${r.status}`, ...names];
  } catch (e) {
    return [`error: ${e}`];
  }
}

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

  const davRoot     = `${ncUrl}/remote.php/dav/files/${ncUser}`;
  const rootContent = await listDav(davRoot + '/', authHeader);
  const acadContent = await listDav(davRoot + '/AcademiaJRubio/', authHeader);
  const filesContent = await listDav(davRoot + '/AcademiaJRubio/files/', authHeader);

  return NextResponse.json({
    ncUrl, ncUser, ncBase,
    davRoot,
    '1_root_carpetas': rootContent,
    '2_AcademiaJRubio_carpetas': acadContent,
    '3_AcademiaJRubio_files_carpetas': filesContent,
  });
}
