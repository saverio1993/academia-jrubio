import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { bytes, dateShort } from '@/lib/format';
import { DownloadButton } from './download-button';
import { AIChat } from './ai-chat';

export const dynamic = 'force-dynamic';

const BRANDS = ['Todas', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Tecno', 'Infinix', 'iPhone', 'Otros'];
const CATEGORIES = ['Todas', 'firmware', 'drivers', 'herramientas', 'tutoriales', 'certificados', 'root', 'frp', 'unlock'];

export default async function ArchivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/archivos');

  const { q, brand, category } = await searchParams;
  const userId = session.user.id;
  const hasSub = await hasActiveSubscription(userId);

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' as const } },
      { brand: { contains: q, mode: 'insensitive' as const } },
      { model: { contains: q, mode: 'insensitive' as const } },
      { tags: { has: q } },
    ];
  }

  if (brand && brand !== 'Todas') where.brand = brand;
  if (category && category !== 'Todas') where.category = category;

  const files = await prisma.fileItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Marcas y categorías únicas para los filtros
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
    <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Archivos</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {files.length} archivo(s) · {!hasSub && <span className="text-[var(--color-accent)]">Premium requiere suscripción</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            ← Volver
          </a>
          <a
            href="/planes"
            className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20"
          >
            Ver planes
          </a>
        </div>
      </div>

      {/* Layout 2 columnas: biblioteca (izq) + chat IA (der) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* COLUMNA IZQUIERDA: Biblioteca */}
        <div>
          {/* Filtros */}
          <form className="mb-6 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-[var(--color-muted)] mb-1">Buscar</label>
              <input
                name="q"
                defaultValue={q ?? ''}
                placeholder="Buscar archivos…"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-muted)] mb-1">Marca</label>
              <select
                name="brand"
                defaultValue={brand ?? 'Todas'}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              >
                {BRANDS.filter(b => b === 'Todas' || allBrands.some(ab => ab.brand === b)).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-muted)] mb-1">Categoría</label>
              <select
                name="category"
                defaultValue={category ?? 'Todas'}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              >
                {CATEGORIES.filter(c => c === 'Todas' || allCategories.some(ac => ac.category === c)).map(c => (
                  <option key={c} value={c}>{c === 'Todas' ? 'Todas' : c}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Filtrar
            </button>
          </form>

          {/* Lista de archivos */}
          {files.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
              <p className="text-[var(--color-muted)]">No hay archivos que coincidan con tu búsqueda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f) => {
                const blocked = f.isPremium && !hasSub;
                return (
                  <div
                    key={f.id}
                    className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden ${
                      blocked ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{f.title}</p>
                          {f.isPremium && (
                            <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                              Premium
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                          {f.brand} {f.model ? `· ${f.model}` : ''}
                          {f.category ? ` · ${f.category}` : ''}
                          {f.version ? ` · ${f.version}` : ''}
                          {f.sizeBytes ? ` · ${bytes(f.sizeBytes)}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <span className="text-xs text-[var(--color-muted)] hidden sm:inline">
                          {dateShort(f.createdAt)}
                        </span>
                        <DownloadButton
                          fileId={f.id}
                          storageKey={f.storageKey}
                          blocked={blocked}
                          userId={userId}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Chat IA */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AIChat />
        </aside>
      </div>
    </main>
  );
}
