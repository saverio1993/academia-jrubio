import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { verifyPendingReg } from '@/lib/pending-reg';

export const dynamic = 'force-dynamic';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = await auth();

  // Detectar si fue un registro nuevo (cookie pendiente)
  const jar     = await cookies();
  const rawReg  = jar.get('_pending_reg')?.value;
  const pending = rawReg ? verifyPendingReg(rawReg) : null;
  const isNewReg = !session?.user?.id && !!pending;

  // Limpiar la cookie (el usuario ya pagó — la cuenta fue creada por el webhook)
  if (rawReg) {
    jar.delete('_pending_reg');
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
          {isNewReg ? (
            <p className="text-[var(--color-muted)]">
              Tu cuenta ha sido creada y tu suscripción está activa.
              Inicia sesión para acceder.
            </p>
          ) : (
            <p className="text-[var(--color-muted)]">
              Bienvenido a Academia J Rubio. Tu suscripción está activa.
            </p>
          )}
        </div>

        {session_id && (
          <p className="text-xs text-[var(--color-muted)] font-mono break-all">
            Ref: {session_id}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-4">
          {isNewReg ? (
            <>
              <Link
                href="/signin"
                className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-5 py-3 font-medium transition-colors"
              >
                Iniciar sesión →
              </Link>
              {pending?.email && (
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Usa el correo <strong>{pending.email}</strong> y la contraseña que elegiste.
                </p>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}
