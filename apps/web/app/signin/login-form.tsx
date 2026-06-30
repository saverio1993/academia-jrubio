'use client';

import { useActionState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function GoogleSignInButton() {
  return (
    <button
      type="button"
      className="gbtn"
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Continuar con Google
    </button>
  );
}

const inputCls = 'w-full rounded-lg border border-[var(--lp-border,rgba(255,255,255,0.1))] bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--lp-accent,#f97316)] transition-colors';

type State = { ok: false; error: string } | null;

export function LoginForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_prev: State, fd: FormData): Promise<State> => {
    const email    = String(fd.get('email')    ?? '').trim();
    const password = String(fd.get('password') ?? '');
    if (!email || !password) return { ok: false, error: 'Completa todos los campos.' };

    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) return { ok: false, error: 'Correo o contraseña incorrectos.' };
    router.push('/dashboard');
    return null;
  }, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs text-white/60 mb-1.5">Correo electrónico</label>
        <input name="email" type="email" required placeholder="correo@ejemplo.com" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs text-white/60 mb-1.5">Contraseña</label>
        <input name="password" type="password" required placeholder="Tu contraseña" className={inputCls} />
      </div>

      {state?.ok === false && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          ⚠ {state.error}
        </div>
      )}

      <button
        type="submit" disabled={pending}
        className="w-full rounded-lg py-3 text-sm font-bold text-white transition-colors disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}
      >
        {pending ? 'Entrando…' : 'Iniciar sesión'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
        ¿Olvidaste tu contraseña?{' '}
        <a href="mailto:soporte@academiajrubio.com" style={{ color: 'var(--lp-accent)', textDecoration: 'none' }}>
          Contáctanos
        </a>
      </p>
    </form>
  );
}
