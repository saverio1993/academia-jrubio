import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { UserMenu } from './user-menu';
import { MobileMenu } from './mobile-menu';

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
        {/* Logo a la izquierda — siempre va al inicio */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-academia.png"
            alt="Academia J Rubio"
            className="h-10 w-10 object-contain transition-transform group-hover:scale-105"
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
              Biblioteca de Archivos
            </span>
            <span className="font-bold text-sm text-[var(--color-fg)] group-hover:text-[var(--color-accent)] transition-colors">
              Academia J Rubio
            </span>
          </div>
        </Link>

        {/* Centro: Archivos + Academia (en naranja) */}
        <nav className="hidden md:flex items-center gap-5 text-sm flex-1 justify-center">
          {logged ? (
            <>
              <Link href="/archivos" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
                Archivos
              </Link>
              <Link
                href="/academia"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors font-medium"
              >
                Academia
              </Link>
            </>
          ) : (
            <>
              <a href="#beneficios" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Beneficios</a>
              <a href="#planes" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">Planes</a>
              <Link href="/academia" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors font-medium">
                Academia
              </Link>
            </>
          )}
        </nav>

        {/* Derecha: Suscripción + Avatar + Hamburguesa */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {logged ? (
            <>
              {/* Suscripción: resaltado amarillo — solo en sm+ */}
              <Link
                href="/planes"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-3 py-1.5 text-sm font-semibold hover:bg-yellow-500/30 transition-colors"
                title="Gestionar tu suscripción"
              >
                <span>⭐</span>
                <span>Suscripción</span>
              </Link>
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
                className="hidden md:inline-block rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Suscríbete
              </Link>
            </>
          )}
          <MobileMenu logged={logged} role={user?.role} />
        </div>
      </div>
    </header>
  );
}
