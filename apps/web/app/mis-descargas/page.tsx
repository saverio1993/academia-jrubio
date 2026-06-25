import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { TopNav } from '@/components/top-nav';
import { DownloadButton } from '@/app/archivos/download-button';
import { bytes } from '@/lib/format';

export const dynamic = 'force-dynamic';

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

export default async function MisDescargasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/mis-descargas');

  const userId = session.user.id;
  const { q, category } = await searchParams;

  const hasSub = !!(await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true },
  }));

  const downloads = await prisma.download.findMany({
    where: {
      userId,
      ...(q || category ? {
        file: {
          AND: [
            q        ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }, { model: { contains: q, mode: 'insensitive' } }] } : {},
            category ? { category: { equals: category, mode: 'insensitive' } } : {},
          ],
        },
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      file: {
        select: { id: true, title: true, brand: true, model: true, category: true, storageKey: true, sizeBytes: true, isPremium: true },
      },
    },
  });

  const categories = [...new Set(downloads.map(d => d.file.category))].sort();

  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">📥 Mis descargas</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">{downloads.length} descarga{downloads.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filtros */}
        <form className="flex flex-wrap gap-2 mb-6" action="/mis-descargas">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nombre, marca, modelo…"
            className="flex-1 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
          <select
            name="category"
            defaultValue={category ?? ''}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => (
              <option key={c} value={c} className="capitalize">{c}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-[var(--color-accent)] text-white px-4 py-2 text-sm font-medium">
            Filtrar
          </button>
          {(q || category) && (
            <a href="/mis-descargas" className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-white/5">
              Limpiar
            </a>
          )}
        </form>

        {downloads.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-16 text-center">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-[var(--color-muted)] text-sm">
              {q || category ? 'Sin resultados para ese filtro.' : 'Aún no has descargado ningún archivo.'}
            </p>
            <a href="/archivos" className="inline-block mt-6 rounded-lg bg-[var(--color-accent)] text-white px-5 py-2.5 text-sm font-medium">
              Ir a la biblioteca
            </a>
          </div>
        ) : (
          <div className="space-y-1.5">
            {downloads.map((d) => {
              const f       = d.file;
              const icon    = CAT_ICON[f.category] ?? '📄';
              const blocked = f.isPremium && !hasSub;
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    <p className="text-[11px] text-[var(--color-muted)] truncate">
                      {f.brand}{f.model ? ` · ${f.model}` : ''} · <span className="capitalize">{f.category}</span>
                      {f.sizeBytes ? ` · ${bytes(f.sizeBytes)}` : ''}
                    </p>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)] shrink-0 hidden sm:block whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </p>
                  <div className="shrink-0">
                    <DownloadButton fileId={f.id} storageKey={f.storageKey} blocked={blocked} userId={userId} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
