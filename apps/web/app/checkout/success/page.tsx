import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-10">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">¡Pago confirmado!</h1>
          <p className="text-[var(--color-muted)]">
            Bienvenido a Academia J Rubio. Tu suscripción está activa.
          </p>
        </div>

        {session_id && (
          <p className="text-xs text-[var(--color-muted)] font-mono break-all">
            Ref: {session_id}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 py-3 font-medium transition-colors"
          >
            Ir a mi cuenta
          </Link>
          <Link
            href="/biblioteca"
            className="rounded-lg border border-[var(--color-border)] hover:bg-white/5 px-5 py-3 font-medium transition-colors"
          >
            Explorar la biblioteca
          </Link>
        </div>
      </div>
    </main>
  );
}
