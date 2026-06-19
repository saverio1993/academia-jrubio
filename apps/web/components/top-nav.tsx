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
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={logged ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-base shrink-0">
          <span className="text-xl">📚</span>
          <span className="hidden sm:inline">Biblioteca</span>
          <span className="text-[var(--color-accent)]">de Archivos</span>
        </Link>

        {/* Links centrales */}
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
              <Link href="/planes" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
                Planes
              </Link>
              {user?.role === 'ADMIN' && (
                <Link href="/admin" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors font-medium">
                  Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <a href="#beneficios" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Beneficios</a>
              <a href="#planes" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Planes</a>
              <Link href="/academia" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Academia</Link>
              <a href="#opiniones" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Opiniones</a>
            </>
          )}
        </nav>

        {/* Acciones a la derecha */}
        <div className="flex items-center gap-2 shrink-0">
          {logged ? (
            <UserMenu
              name={user?.name ?? null}
              email={user?.email ?? null}
              image={user?.image ?? null}
              role={user?.role ?? 'USER'}
            />
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
