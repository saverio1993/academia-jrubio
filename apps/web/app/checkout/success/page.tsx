import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string; unpaid?: string }>;
}) {
  const params = await searchParams;

  if (params.error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-10">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠</span>
          </div>
          <h1 className="text-2xl font-bold">Hubo un problema</h1>
          <p className="text-[var(--color-muted)]">No pudimos verificar tu pago. Si se realizó el cobro, contáctanos.</p>
          <Link href="/planes" className="inline-block rounded-lg bg-[var(--color-accent)] text-white px-6 py-3 font-medium">
            Volver a planes
          </Link>
        </div>
      </main>
    );
  }

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

        <div className="flex flex-col gap-2 pt-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 py-3 font-medium transition-colors"
          >
            Ir a mi cuenta
          </Link>
          <Link
            href="/archivos"
            className="rounded-lg border border-[var(--color-border)] hover:bg-white/5 px-5 py-3 font-medium transition-colors"
          >
            Explorar la biblioteca
          </Link>
        </div>
      </div>
    </main>
  );
}
