import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { getLevel } from '@/lib/reputation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

function initials(name?: string | null) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default async function TgHomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [recentFiles, recentPosts, fileCount, postCount] = await Promise.all([
    prisma.fileItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, brand: true, model: true, category: true },
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        slug: true,
        title: true,
        category: true,
        _count: { select: { comments: true } },
        comments: { where: { isSolution: true }, select: { id: true }, take: 1 },
      },
    }),
    prisma.fileItem.count(),
    prisma.post.count({ where: { status: 'PUBLISHED' } }),
  ]);

  const hasSub = userId
    ? (session.user.role === 'ADMIN' || session.user.role === 'MODERATOR') ||
      await hasActiveSubscription(userId)
    : false;

  const user = session?.user;

  return (
    <div className="p-4 space-y-5 pt-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        {user?.image ? (
          <img src={user.image} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--color-accent)' }}
          >
            {initials(user?.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {user ? `Hola, ${user.name?.split(' ')[0] ?? 'técnico'} 👋` : 'Academia J Rubio'}
          </p>
          {user ? (
            <p className="text-xs mt-0.5" style={{ color: hasSub ? '#22c55e' : 'var(--color-muted)' }}>
              {hasSub ? '✅ Suscripción activa' : '⚠️ Sin suscripción activa'}
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              <Link href="/tg/vincular" className="underline" style={{ color: 'var(--color-accent)' }}>
                Vincular cuenta
              </Link>{' '}para acceso completo
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4 border border-[var(--color-border)]"
          style={{ background: 'var(--color-card)' }}
        >
          <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{fileCount}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>archivos disponibles</p>
        </div>
        <div
          className="rounded-xl p-4 border border-[var(--color-border)]"
          style={{ background: 'var(--color-card)' }}
        >
          <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{postCount}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>posts en el foro</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { href: '/tg/archivos', icon: '📁', label: 'Buscar archivos', color: '#3b82f6' },
          { href: '/tg/ia',       icon: '🤖', label: 'Preguntar IA',    color: '#f59e0b' },
          { href: '/tg/comunidad',icon: '💬', label: 'Ver foro',        color: '#8b5cf6' },
          { href: '/archivos',    icon: '🌐', label: 'Web completa',    color: '#22c55e' },
        ] as const).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl p-4 border border-[var(--color-border)] transition-colors hover:border-[var(--color-accent)]/40"
            style={{ background: 'var(--color-card)' }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent files */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Archivos recientes</h2>
          <Link href="/tg/archivos" className="text-xs" style={{ color: 'var(--color-accent)' }}>
            Ver todos →
          </Link>
        </div>
        <div className="space-y-2">
          {recentFiles.map((f) => (
            <Link
              key={f.id}
              href={`/tg/archivos?q=${encodeURIComponent(f.brand ?? '')}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 border border-[var(--color-border)]"
              style={{ background: 'var(--color-card)' }}
            >
              <span className="text-xl">{CAT_ICON[f.category] ?? '📄'}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{f.title}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                  {f.brand}{f.model ? ` · ${f.model}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent posts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Foro reciente</h2>
          <Link href="/tg/comunidad" className="text-xs" style={{ color: 'var(--color-accent)' }}>
            Ver todo →
          </Link>
        </div>
        <div className="space-y-2">
          {recentPosts.map((p) => (
            <Link
              key={p.slug}
              href={`/comunidad/${p.slug}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 border border-[var(--color-border)]"
              style={{ background: 'var(--color-card)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{p.title}</p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                  {p._count.comments} respuestas
                  {p.comments.length > 0 && ' · ✅ Resuelto'}
                </p>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
