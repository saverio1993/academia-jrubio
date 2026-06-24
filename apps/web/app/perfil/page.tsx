import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@academia/db';
import { hasActiveSubscription } from '@/lib/access';
import { TopNav } from '@/components/top-nav';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/perfil');

  const [user, hasSub] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    hasActiveSubscription(session.user.id),
  ]);

  if (!user) redirect('/');

  const displayName = user.name ?? user.email ?? '';

  return (
    <>
      <TopNav />
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Mi perfil</h1>
        <p className="text-sm text-[var(--color-muted)] mb-8">Tu información personal y cuenta</p>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Card de identidad */}
          <div className="md:col-span-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={displayName} className="w-24 h-24 rounded-full mx-auto object-cover mb-4 ring-2 ring-[var(--color-accent)]" />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto bg-[var(--color-accent)] text-white text-3xl font-semibold flex items-center justify-center mb-4">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <p className="font-semibold text-lg">{displayName}</p>
            {user.username && (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">@{user.username}</p>
            )}
            <p className="text-xs text-[var(--color-muted)] mt-1">{user.email}</p>
            <span className="inline-block mt-3 rounded-full bg-[var(--color-accent)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
              {user.role}
            </span>
            {hasSub && (
              <p className="text-xs text-green-400 mt-3">✓ Suscripción activa</p>
            )}
            <p className="text-[10px] text-[var(--color-muted)] mt-4">
              Miembro desde {new Date(user.createdAt).toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-[var(--color-muted)] mt-2 opacity-60">
              La foto viene de Google y se actualiza automáticamente.
            </p>
          </div>

          {/* Formulario de edición */}
          <div className="md:col-span-2 space-y-5">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-6">
                Editar perfil
              </h2>
              <ProfileForm
                initialName={displayName}
                initialUsername={user.username ?? ''}
                email={user.email ?? ''}
              />
            </div>

            {/* Acciones secundarias */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-4">
                Cuenta
              </h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  📊 Mi dashboard
                </Link>
                <Link
                  href="/planes"
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  ⭐ Ver planes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
