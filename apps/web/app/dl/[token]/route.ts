import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';
import { getStorage } from '@academia/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const link = await prisma.oneTimeLink.findUnique({
    where: { token },
    include: { fileItem: true },
  });

  if (!link) {
    return new NextResponse('Link no válido o no existe.', { status: 404 });
  }

  if (link.usedAt) {
    return new NextResponse('Este link ya fue usado. Solicita uno nuevo.', { status: 410 });
  }

  if (new Date() > link.expiresAt) {
    return new NextResponse('Este link ha expirado.', { status: 410 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';

  await prisma.oneTimeLink.update({
    where: { token },
    data: { usedAt: new Date(), usedByIp: ip },
  });

  try {
    const storage = getStorage();
    const share = await storage.getShareLink(link.fileItem.storageKey, { expiresIn: 3600 });
    return NextResponse.redirect(share.url);
  } catch {
    return new NextResponse('Error al generar el enlace de descarga.', { status: 500 });
  }
}
