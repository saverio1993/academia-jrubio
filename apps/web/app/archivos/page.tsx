import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { AIChat } from './ai-chat';
import { FileTree } from './file-tree';
import { HeroSearch } from './hero-search';
import { SmartSearch } from './smart-search';
import { TopNav } from '@/components/top-nav';

export const dynamic = 'force-dynamic';

export default async function ArchivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/archivos');

  const { q, brand, category } = await searchParams;
  const userId = session.user.id;
  // Admins y moderadores tienen acceso completo sin necesidad de suscripción
  const role = session.user.role as string | undefined;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = isAdmin || await hasActiveSubscription(userId);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' as const } },
      { brand: { contains: q, mode: 'insensitive' as const } },
      { model: { contains: q, mode: 'insensitive' as const } },
      { subcategory: { contains: q, mode: 'insensitive' as const } },
      { tags: { has: q } },
    ];
  }
  if (brand && brand !== 'Todas') where.brand = brand;
  if (category && category !== 'Todas') where.category = category;

  const files = await prisma.fileItem.findMany({
    where,
    orderBy: [
      { brand: 'asc' },
      { subcategory: 'asc' },
      { model: 'asc' },
      { title: 'asc' },
    ],
    take: 1500, // Subido a 1500 para mostrar todo
  });

  const allBrands = await prisma.fileItem.findMany({
    select: { brand: true },
    distinct: ['brand'],
    orderBy: { brand: 'asc' },
  });
  const allCategories = await prisma.fileItem.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return (
    <>
      <TopNav />
      <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">📚 Biblioteca de Archivos</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {files.length} archivo(s) · {!hasSub && <span className="text-[var(--color-accent)]">Premium requiere suscripción</span>}
          </p>
        </div>

        {/* Buscador estilo samfw */}
        <HeroSearch
          defaultBrand={brand}
          defaultCategory={category}
          defaultQ={q}
          availableBrands={allBrands.map(b => b.brand)}
          availableCategories={allCategories.map(c => c.category)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* COLUMNA IZQUIERDA: Biblioteca en árbol */}
          <div>
            {/* Búsqueda rápida con autocompletado */}
            <SmartSearch userId={userId} hasSub={hasSub} />

            {files.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
                <p className="text-[var(--color-muted)]">No hay archivos que coincidan con tu búsqueda.</p>
              </div>
            ) : (
              <FileTree files={files} hasSub={hasSub} userId={userId} />
            )}
          </div>

          {/* COLUMNA DERECHA: Chat IA */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <AIChat userId={userId} hasSub={hasSub} />
          </aside>
        </div>
      </main>
    </>
  );
}
