import { NextResponse } from 'next/server';
import { prisma } from '@academia/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - 45 * 24 * 3600 * 1000);
    const recent = await prisma.fileItem.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: { id: true, title: true, brand: true, category: true, createdAt: true },
    });

    const files = recent.length >= 4
      ? recent
      : await prisma.fileItem.findMany({
          orderBy: { createdAt: 'desc' },
          take: 18,
          select: { id: true, title: true, brand: true, category: true, createdAt: true },
        });

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
