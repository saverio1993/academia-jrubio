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

  const userId  = session.user.id;
  const role    = session.user.role as string | undefined;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub  = isAdmin || await hasActiveSubscription(userId);

  const favIds = (await prisma.favorite.findMany({ where: { userId }, select: { fileItemId: true } }))
    .map(f => f.fileItemId);

  const [files, brandCount, categoryCount] = await Promise.all([
    prisma.fileItem.findMany({
      orderBy: [{ brand: 'asc' }, { subcategory: 'asc' }, { model: 'asc' }, { title: 'asc' }],
      take: 1500,
    }),
    prisma.fileItem.findMany({ select: { brand: true }, distinct: ['brand'] }).then(r => r.length),
    prisma.fileItem.findMany({ select: { category: true }, distinct: ['category'] }).then(r => r.length),
  ]);

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">

        {/* ── HERO HEADER ── */}
        <div
          className="border-b border-[var(--color-border)]"
          style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)', border: '1px solid rgba(249,115,22,0.3)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse inline-block" />
                    Biblioteca
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight">
                  Archivos<span style={{ color: 'var(--color-accent)' }}> &</span> Firmware
                </h1>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  {!hasSub
                    ? 'Suscripción Premium requerida para descargar archivos protegidos'
                    : 'Acceso completo · Descarga directa desde Nextcloud'}
                </p>
              </div>

              {/* Stats chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { icon: '📦', label: `${files.length}`, sub: 'archivos' },
                  { icon: '📱', label: `${brandCount}`, sub: 'marcas' },
                  { icon: '🗂️', label: `${categoryCount}`, sub: 'categorías' },
                ].map(s => (
                  <div
                    key={s.sub}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5"
                  >
                    <span className="text-base">{s.icon}</span>
                    <div>
                      <p className="text-base font-bold leading-none">{s.label}</p>
                      <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

            {/* COLUMNA IZQUIERDA */}
            <div className="min-w-0">
              <SmartSearch userId={userId} hasSub={hasSub} />
              <FileTree files={files} hasSub={hasSub} userId={userId} favIds={favIds} />
            </div>

            {/* COLUMNA DERECHA: Chat IA */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              {/* Label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-4 rounded-full bg-[var(--color-accent)]" />
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Asistente IA</p>
              </div>
              <AIChat userId={userId} hasSub={hasSub} />
            </aside>

          </div>
        </div>
      </main>
    </>
  );
}
