import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@academia/db';
import { StorageService } from './storage.service';

interface ListInput {
  brand?: string;
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class FilesService {
  constructor(private readonly storage: StorageService) {}

  async list(input: ListInput) {
    const where = {
      ...(input.brand ? { brand: input.brand } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: 'insensitive' as const } },
              { model: { contains: input.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.fileItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit ?? 20,
        skip: input.offset ?? 0,
        select: {
          id: true, title: true, brand: true, model: true, category: true,
          subcategory: true, version: true, sizeBytes: true,
          isPremium: true, downloadsCount: true, tags: true, createdAt: true,
        },
      }),
      prisma.fileItem.count({ where }),
    ]);

    return {
      data: items.map(i => ({ ...i, sizeBytes: i.sizeBytes?.toString() })),
      pagination: { total, limit: input.limit ?? 20, offset: input.offset ?? 0 },
    };
  }

  async getDownloadLink(fileId: string, userId?: string, ip?: string) {
    const file = await prisma.fileItem.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Archivo no encontrado');

    const link = await this.storage.adapter.getShareLink(file.storageKey, {
      expiresIn: 86_400,
    });

    await prisma.$transaction([
      prisma.fileItem.update({
        where: { id: file.id },
        data: { downloadsCount: { increment: 1 } },
      }),
      ...(userId
        ? [prisma.download.create({ data: { fileId: file.id, userId, ip } })]
        : []),
    ]);

    return {
      url: link.url,
      expiresAt: link.expiresAt,
      file: { id: file.id, title: file.title, sizeBytes: file.sizeBytes?.toString() },
    };
  }
}
