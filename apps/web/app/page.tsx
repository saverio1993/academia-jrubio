import Link from 'next/link';
import { auth } from '@/auth';

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-3xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
          Plataforma técnica · Panamá
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Academia <span className="text-[var(--color-accent)]">J Rubio</span>
        </h1>

        <p className="text-lg md:text-xl text-[var(--color-muted)] max-w-2xl mx-auto">
          La plataforma premium para técnicos de telefonía móvil.
          Firmware, herramientas, tutoriales y soporte con IA — en un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/planes"
            className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-3 font-medium transition-colors"
          >
            Ver planes
          </Link>
          <Link
            href="/academia"
            className="rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-card)] px-6 py-3 font-medium transition-colors"
          >
            Academia
          </Link>
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-card)] px-6 py-3 font-medium transition-colors"
            >
              Ir a mi cuenta
            </Link>
          ) : (
            <Link
              href="/signin"
              className="rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-card)] px-6 py-3 font-medium transition-colors"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
