import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { TopNav } from '@/components/top-nav';

export const dynamic = 'force-dynamic';

export default async function SeguridadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/perfil/seguridad');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/');

  const userWithHash = user as unknown as { passwordHash?: string | null };
  const hasPassword = !!userWithHash.passwordHash;

  return (
    <>
      <TopNav />
      <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔒 Seguridad de la cuenta</h1>
      <p className="text-sm text-[var(--color-muted)] mb-8">Gestiona cómo accedes a tu cuenta</p>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 max-w-xl space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[var(--color-border)]">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl">
            🔑
          </div>
          <div>
            <p className="font-semibold">Método de inicio de sesión</p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              {hasPassword ? 'Email + contraseña' : 'Google (OAuth)'}
            </p>
          </div>
          <span className={`ml-auto text-xs rounded-full px-2.5 py-0.5 ${hasPassword ? 'bg-green-500/20 text-green-400' : 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'}`}>
            Activo
          </span>
        </div>

        {hasPassword ? (
          <div>
            <p className="text-sm text-[var(--color-muted)]">
              Para cambiar tu contraseña, contacta al administrador o usa el flujo de recuperación de contraseña por email.
            </p>
            <a
              href="mailto:admin@academia-jrubio.com?subject=Cambiar%20contrase%C3%B1a"
              className="mt-4 inline-block rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              ✉️ Solicitar cambio por email
            </a>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--color-muted)] mb-3">
              Tu cuenta usa el inicio de sesión de Google. Para acceder solo necesitas tu cuenta de Google.
            </p>
            <ul className="text-xs text-[var(--color-muted)] space-y-1.5 list-disc pl-5">
              <li>No necesitas recordar contraseñas adicionales</li>
              <li>La sesión es gestionada por Google con autenticación de dos factores</li>
              <li>Para revocar el acceso, ve a tu cuenta de Google → Apps conectadas</li>
            </ul>
          </div>
        )}
      </div>
      </main>
    </>
  );
}
