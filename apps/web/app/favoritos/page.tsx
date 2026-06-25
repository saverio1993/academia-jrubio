import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { redirect } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import { DownloadButton } from '@/app/archivos/download-button';
import { FavoriteButton } from '@/app/archivos/favorite-button';
import { bytes } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function FavoritosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/favoritos');

  const userId = session.user.id;

  const hasSub = !!(await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: { id: true },
  }));

  const favorites = await prisma.favorite.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { fileItem: true },
  });

  const CAT_ICON: Record<string, string> = {
    firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
    dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#f97316" stroke="#f97316" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Mis guardados
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">{favorites.length} archivo{favorites.length !== 1 ? 's' : ''} guardado{favorites.length !== 1 ? 's' : ''}</p>
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-16 text-center">
            <p className="text-4xl mb-4">🤍</p>
            <p className="text-[var(--color-muted)] text-sm">Aún no tienes archivos guardados.</p>
            <p className="text-[var(--color-muted)] text-xs mt-1">
              En la biblioteca, haz click en el corazón junto a cualquier archivo.
            </p>
            <a href="/archivos" className="inline-block mt-6 rounded-lg bg-[var(--color-accent)] text-white px-5 py-2.5 text-sm font-medium">
              Ir a la biblioteca
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {favorites.map(({ fileItem: f, createdAt }) => {
              const blocked = f.isPremium && !hasSub;
              const icon    = CAT_ICON[f.category] ?? '📄';
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-xl shrink-0">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    <p className="text-[11px] text-[var(--color-muted)] truncate">
                      {f.brand}{f.model ? ` · ${f.model}` : ''} · <span className="capitalize">{f.category}</span>
                      {f.sizeBytes ? ` · ${bytes(f.sizeBytes)}` : ''}
                    </p>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)] shrink-0 hidden sm:block">
                    {new Date(createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <FavoriteButton fileItemId={f.id} initialFav={true} />
                    <DownloadButton
                      fileId={f.id}
                      storageKey={f.storageKey}
                      blocked={blocked}
                      userId={userId}
                    />
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
