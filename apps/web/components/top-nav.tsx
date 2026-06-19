import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { UserMenu } from './user-menu';

export async function TopNav() {
  const session = await auth();
  const logged = Boolean(session?.user?.id);

  let user: { name: string | null; email: string | null; image: string | null; role: string } | null = null;
  if (logged) {
    user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { name: true, email: true, image: true, role: true },
    });
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Logo a la izquierda */}
        <Link href={logged ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-base shrink-0">
          <span className="text-xl">📚</span>
          <span className="hidden sm:inline">Biblioteca</span>
          <span className="text-[var(--color-accent)]">de Archivos</span>
        </Link>

        {/* Links centrales: Inicio, Archivos, Academia */}
        <nav className="hidden md:flex items-center gap-5 text-sm flex-1 justify-center">
          {logged ? (
            <>
              <Link href="/dashboard" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
                Inicio
              </Link>
              <Link href="/archivos" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
                Archivos
              </Link>
              <Link href="/academia" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
                Academia
              </Link>
            </>
          ) : (
            <>
              <a href="#beneficios" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Beneficios</a>
              <a href="#planes" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Planes</a>
              <Link href="/academia" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Academia</Link>
            </>
          )}
        </nav>

        {/* Acciones a la derecha */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {logged ? (
            <>
              {/* Suscripción: resaltado amarillo */}
              <Link
                href="/planes"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-3 py-1.5 text-sm font-semibold hover:bg-yellow-500/30 transition-colors"
                title="Gestionar tu suscripción"
              >
                <span>⭐</span>
                <span>Suscripción</span>
              </Link>
              {/* Admin: solo si admin */}
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-block text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                >
                  Admin
                </Link>
              )}
              <UserMenu
                name={user?.name ?? null}
                email={user?.email ?? null}
                image={user?.image ?? null}
                role={user?.role ?? 'USER'}
              />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="hidden sm:inline-block text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors px-3 py-1.5"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/planes"
                className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Suscríbete
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
