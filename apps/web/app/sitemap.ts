import type { MetadataRoute } from 'next';
import { prisma } from '@academia/db';
import { CATEGORIES } from './comunidad/categories';

const APP_URL = (process.env.APP_URL ?? 'https://academia-jrubio-web.vercel.app').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { status: { in: ['PUBLISHED', 'CLOSED'] } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/comunidad`, changeFrequency: 'hourly', priority: 0.9 },
    ...Object.keys(CATEGORIES).map((cat) => ({
      url: `${APP_URL}/comunidad?cat=${cat}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${APP_URL}/comunidad/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
