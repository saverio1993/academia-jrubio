import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { AIChat } from './ai-chat';
import { FileTree } from './file-tree';
import { SmartSearch } from './smart-search';
import { TopNav } from '@/components/top-nav';

export const dynamic = 'force-dynamic';

export default async function ArchivosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/archivos');

  const userId = session.user.id;
  const role   = session.user.role as string | undefined;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub  = isAdmin || await hasActiveSubscription(userId);

  const favIds = (await prisma.favorite.findMany({ where: { userId }, select: { fileItemId: true } }))
    .map(f => f.fileItemId);

  const files = await prisma.fileItem.findMany({
    orderBy: [
      { brand: 'asc' },
      { subcategory: 'asc' },
      { model: 'asc' },
      { title: 'asc' },
    ],
    take: 1500,
  });

  return (
    <>
      <TopNav />
      <main className="min-h-screen px-6 py-12 max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">📚 Biblioteca de Archivos</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {files.length} archivo(s){!hasSub && <span> · <span className="text-[var(--color-accent)]">Premium requiere suscripción</span></span>}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* COLUMNA IZQUIERDA: Búsqueda inteligente + árbol */}
          <div>
            <SmartSearch userId={userId} hasSub={hasSub} />

            {files.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
                <p className="text-[var(--color-muted)]">No hay archivos en la biblioteca todavía.</p>
              </div>
            ) : (
              <FileTree files={files} hasSub={hasSub} userId={userId} favIds={favIds} />
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
