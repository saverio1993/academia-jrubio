import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { UserMenu } from '@/components/user-menu';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/perfil');

  const [user, hasSub] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    hasActiveSubscription(session.user.id),
  ]);

  if (!user) redirect('/');

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      {/* Navbar superior */}
      <div className="flex items-center justify-between mb-12">
        <Link href="/dashboard" className="text-xl font-bold">
          📚 Mavim <span className="text-[var(--color-accent)]">Biblioteca de Archivos</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/archivos" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
            Archivos
          </Link>
          <Link href="/academia" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
            Academia
          </Link>
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
              Admin
            </Link>
          )}
          <UserMenu name={user.name} email={user.email} image={user.image} role={user.role} />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">Mi perfil</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">Tu información personal y cuenta</p>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card de identidad */}
        <div className="md:col-span-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ''} className="w-24 h-24 rounded-full mx-auto object-cover mb-4" />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-[var(--color-accent)] text-white text-3xl font-semibold flex items-center justify-center mb-4">
              {(user.name || user.email || '?').substring(0, 2).toUpperCase()}
            </div>
          )}
          <p className="font-semibold">{user.name ?? 'Sin nombre'}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">{user.email}</p>
          <span className="inline-block mt-3 rounded-full bg-[var(--color-accent)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
            {user.role}
          </span>
          {hasSub && (
            <p className="text-xs text-green-400 mt-3">✓ Suscripción activa</p>
          )}
        </div>

        {/* Card de datos */}
        <div className="md:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Datos de la cuenta</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--color-muted)]">Nombre</p>
              <p className="text-sm font-medium mt-1">{user.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">Email</p>
              <p className="text-sm font-medium mt-1">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">Cuenta creada</p>
              <p className="text-sm font-medium mt-1">{new Date(user.createdAt).toLocaleDateString('es-PA')}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">Proveedor</p>
              <p className="text-sm font-medium mt-1">Google</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap gap-2">
            <Link
              href="/perfil/seguridad"
              className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              🔒 Cambiar contraseña
            </Link>
            <Link
              href="/planes"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
