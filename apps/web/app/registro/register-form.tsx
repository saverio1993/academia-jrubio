'use client';

import { useActionState, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { registerUser } from './actions';

const inputCls = 'w-full rounded-lg border border-[var(--lp-border,rgba(255,255,255,0.1))] bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--lp-accent,#f97316)] transition-colors';

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8)              s++;
  if (pw.length >= 12)             s++;
  if (/[A-Z]/.test(pw))           s++;
  if (/[0-9]/.test(pw))           s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  if (s <= 1) return { score: s, label: 'Muy débil',  color: '#ef4444' };
  if (s === 2) return { score: s, label: 'Débil',     color: '#f97316' };
  if (s === 3) return { score: s, label: 'Aceptable', color: '#eab308' };
  if (s === 4) return { score: s, label: 'Fuerte',    color: '#22c55e' };
  return              { score: s, label: 'Muy fuerte',color: '#16a34a' };
}

export function RegisterForm() {
  const router = useRouter();

  // Mantener email y password en estado para usarlos en signIn después
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [state, action, pending] = useActionState(registerUser, null);
  const str = strength(password);

  // Cuando el servidor dice ok:true → iniciar sesión y redirigir
  useEffect(() => {
    if (state?.ok !== true) return;
    setSigningIn(true);
    setLoginError('');
    signIn('credentials', { email, password, redirect: false })
      .then(res => {
        if (res?.error) {
          setLoginError('Cuenta creada, pero falló el inicio automático. Ve a iniciar sesión.');
          setSigningIn(false);
        } else {
          router.push('/planes');
        }
      })
      .catch(() => {
        setLoginError('Cuenta creada. Ve a iniciar sesión.');
        setSigningIn(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const busy = pending || signingIn;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs text-white/60 mb-1.5">Nombre completo</label>
        <input name="name" type="text" required placeholder="Juan Pérez" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs text-white/60 mb-1.5">Correo electrónico</label>
        <input
          name="email" type="email" required placeholder="correo@ejemplo.com"
          className={inputCls}
          value={email} onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-white/60 mb-1.5">Contraseña</label>
        <input
          name="password" type="password" required
          placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
          className={inputCls}
          value={password} onChange={e => setPassword(e.target.value)}
        />
        {password.length > 0 && (
          <div className="mt-1.5 space-y-1">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                  style={{ background: i <= str.score ? str.color : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <p className="text-[11px]" style={{ color: str.color }}>{str.label}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-white/60 mb-1.5">Confirmar contraseña</label>
        <input name="confirm" type="password" required placeholder="Repite la contraseña" className={inputCls} />
      </div>

      {state?.ok === false && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          ⚠ {state.error}
        </div>
      )}

      {loginError && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-400">
          ⚠ {loginError}
        </div>
      )}

      {signingIn && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
          ✓ Cuenta creada — iniciando sesión…
        </div>
      )}

      <button
        type="submit" disabled={busy}
        className="w-full rounded-lg py-3 text-sm font-bold text-white transition-colors disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}
      >
        {pending   ? 'Creando cuenta…'   :
         signingIn ? 'Iniciando sesión…' :
         'Crear cuenta y elegir plan →'}
      </button>

      <p className="text-[11px] text-white/40 text-center">
        Al registrarte aceptas los términos de uso y política de privacidad.
      </p>
    </form>
  );
}
