'use client';

import { useActionState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
