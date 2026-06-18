import { Injectable } from '@nestjs/common';
import { prisma } from '@academia/db';

@Injectable()
export class PlansService {
  async findAll() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        priceCents: true,
        currency: true,
        billingCycle: true,
        features: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.plan.findUnique({ where: { slug } });
  }
}
