import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

const NC_URL  = process.env.NEXTCLOUD_URL  ?? '';
const NC_USER = process.env.NEXTCLOUD_USER ?? '';
const NC_PASS = process.env.NEXTCLOUD_APP_PASSWORD ?? '';
const NC_BASE = (process.env.NEXTCLOUD_BASE_PATH ?? '/AcademiaJRubio/files').replace(/\/+$/, '');

async function nextcloudShareUrl(storageKey: string): Promise<string> {
  const fullPath      = storageKey.startsWith('/') ? storageKey : `${NC_BASE}/${storageKey}`;
  const expireDate    = new Date();
  expireDate.setDate(expireDate.getDate() + 1);
  const expireDateStr = expireDate.toISOString().split('T')[0]!;
  const creds = typeof Buffer !== 'undefined'
    ? Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64')
    : btoa(`${NC_USER}:${NC_PASS}`);
  const res  = await fetch(`${NC_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
    method:  'POST',
    headers: { Authorization: `Basic ${creds}`, 'OCS-APIRequest': 'true', Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ path: fullPath, shareType: '3', permissions: '1', expireDate: expireDateStr }).toString(),
  });
  const json = await res.json() as { ocs?: { data?: { url?: string } } };
  const url  = json.ocs?.data?.url;
  if (!url) throw new Error('Sin URL');
  return url.endsWith('/download') ? url : `${url}/download`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base      = new URL(req.url).origin;
  const link = await prisma.oneTimeLink.findUnique({
    where: { token }, include: { fileItem: { select: { storageKey: true } } },
  });
  if (!link)       return NextResponse.redirect(`${base}/?dl=invalid`);
  if (link.usedAt) return NextResponse.redirect(`${base}/?dl=used`);
  if (new Date() > link.expiresAt) return NextResponse.redirect(`${base}/?dl=expired`);
  try {
    const url = await nextcloudShareUrl(link.fileItem.storageKey);
    const ip  = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    await prisma.oneTimeLink.update({ where: { token }, data: { usedAt: new Date(), usedByIp: ip } });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${base}/?dl=error`);
  }
}