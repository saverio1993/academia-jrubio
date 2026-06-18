import Link from 'next/link';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function AcademiaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/academia" className="font-bold tracking-tight">
            Academia <span className="text-[var(--color-accent)]">J Rubio</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">
              Inicio
            </Link>
            {session?.user ? (
              <Link
                href="/dashboard"
                className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]"
              >
                Mi cuenta
              </Link>
            ) : (
              <Link
                href="/signin?callbackUrl=/academia"
                className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
