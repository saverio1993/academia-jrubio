import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@academia/db';

const NC_URL  = process.env.NEXTCLOUD_URL  ?? 'https://cloud.heyvalue.com';
const NC_USER = process.env.NEXTCLOUD_USER ?? '';
const NC_PASS = process.env.NEXTCLOUD_APP_PASSWORD ?? '';
const NC_BASE = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/^\//, '');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const brand = req.nextUrl.searchParams.get('brand');
  const davPath = brand
    ? `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_BASE}/${encodeURIComponent(brand)}/`
    : `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_BASE}/`;

  const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');

  const res = await fetch(davPath, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      Depth: '1',
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:displayname/></d:prop></d:propfind>`,
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Nextcloud error ${res.status}` }, { status: 502 });
  }

  const xml = await res.text();
  const blocks = xml.split('<d:response>').slice(1);

  const folders: string[] = [];
  for (const block of blocks) {
    if (!/<d:collection/.test(block)) continue; // solo carpetas

    const hrefMatch = /<d:href>([^<]+)<\/d:href>/.exec(block);
    if (!hrefMatch) continue;

    const href = decodeURIComponent(hrefMatch[1] ?? '');
    // Quitar el path base para quedarnos solo con el nombre de la carpeta
    const prefix = `/remote.php/dav/files/${NC_USER}/${NC_BASE}/`;
    const subPrefix = brand ? `/remote.php/dav/files/${NC_USER}/${NC_BASE}/${brand}/` : prefix;
    if (!href.startsWith(subPrefix)) continue;

    const relative = href.slice(subPrefix.length).replace(/\/$/, '');
    if (!relative || relative.includes('/')) continue; // solo nivel inmediato
    folders.push(relative);
  }

  folders.sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ folders });
}
