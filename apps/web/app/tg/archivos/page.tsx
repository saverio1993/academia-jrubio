import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { DownloadButton } from '@/app/archivos/download-button';

export const dynamic = 'force-dynamic';

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};
const CAT_LABEL: Record<string, string> = {
  firmware: 'Firmware', drivers: 'Drivers', frp: 'FRP', root: 'Root',
  dump: 'Dump', tutoriales: 'Tutorial', herramientas: 'Herramienta', unlock: 'Unlock',
};

function formatBytes(bytes: number | bigint | null) {
  if (!bytes) return '';
  const n = Number(bytes);
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function TgArchivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const hasSub = userId
    ? (session.user.role === 'ADMIN' || session.user.role === 'MODERATOR') ||
      await hasActiveSubscription(userId)
    : false;

  const where = {
    ...(q ? {
      OR: [
        { title:    { contains: q, mode: 'insensitive' as const } },
        { brand:    { contains: q, mode: 'insensitive' as const } },
        { model:    { contains: q, mode: 'insensitive' as const } },
        { category: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(cat ? { category: cat } : {}),
  };

  const [files, categories] = await Promise.all([
    prisma.fileItem.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { title: 'asc' }],
      take: 50,
    }),
    prisma.fileItem.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b border-[var(--color-border)] p-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <h1 className="text-base font-bold mb-3">📁 Archivos</h1>
        <form method="GET" action="/tg/archivos" className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar marca, modelo, categoría…"
            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          {cat && <input type="hidden" name="cat" value={cat} />}
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--color-accent)' }}
          >
            Buscar
          </button>
        </form>

        {/* Category pills */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
          <a
            href="/tg/archivos"
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${
              !cat
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)]'
            }`}
          >
            Todos
          </a>
          {categories.map((c) => (
            <a
              key={c.category}
              href={`/tg/archivos?${q ? `q=${encodeURIComponent(q)}&` : ''}cat=${c.category}`}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${
                cat === c.category
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'
              }`}
            >
              {CAT_ICON[c.category] ?? '📄'} {CAT_LABEL[c.category] ?? c.category}
            </a>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 p-4">
        {files.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-muted)]">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm">No se encontraron archivos</p>
            {(q || cat) && (
              <a href="/tg/archivos" className="mt-2 text-xs underline" style={{ color: 'var(--color-accent)' }}>
                Ver todos
              </a>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
              {files.length} resultado{files.length !== 1 ? 's' : ''}
              {q ? ` para "${q}"` : ''}
            </p>
            <div className="space-y-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-[var(--color-border)] p-4"
                  style={{ background: 'var(--color-card)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{CAT_ICON[f.category] ?? '📄'}</span>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5"
                          style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)' }}
                        >
                          {CAT_LABEL[f.category] ?? f.category}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-tight">{f.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {f.brand}{f.model ? ` · ${f.model}` : ''}
                        {f.sizeBytes ? ` · ${formatBytes(f.sizeBytes)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <DownloadButton
                        fileId={f.id}
                        storageKey={f.storageKey}
                        blocked={!hasSub && f.isPremium}
                        userId={userId ?? ''}
                        fullWidth={false}
                        label="↓"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
