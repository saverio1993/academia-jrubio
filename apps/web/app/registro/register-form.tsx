'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from './actions';

const inputCls = 'w-full rounded-lg border border-[var(--lp-border,rgba(255,255,255,0.1))] bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[var(--lp-accent,#f97316)] transition-colors';

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8)            s++;
  if (pw.length >= 12)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Muy débil',  color: '#ef4444' };
  if (s === 2) return { score: s, label: 'Débil',     color: '#f97316' };
  if (s === 3) return { score: s, label: 'Aceptable', color: '#eab308' };
  if (s === 4) return { score: s, label: 'Fuerte',    color: '#22c55e' };
  return              { score: s, label: 'Muy fuerte',color: '#16a34a' };
}

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');

  const str = strength(password);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const fd = new FormData();
    fd.append('name',     name);
    fd.append('email',    email);
    fd.append('password', password);
    fd.append('confirm',  confirm);

    startTransition(async () => {
      const result = await registerUser(null, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Datos guardados en cookie — ir a elegir el plan
      router.push('/planes');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-white/60 mb-1.5">Nombre completo</label>
        <input
          type="text" required placeholder="Juan Pérez" className={inputCls}
          value={name} onChange={e => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-white/60 mb-1.5">Correo electrónico</label>
        <input
          type="email" required placeholder="correo@ejemplo.com" className={inputCls}
          value={email} onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-white/60 mb-1.5">Contraseña</label>
        <input
          type="password" required placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
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
        <input
          type="password" required placeholder="Repite la contraseña" className={inputCls}
          value={confirm} onChange={e => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          ⚠ {error}
        </div>
      )}

      <button
        type="submit" disabled={isPending}
        className="w-full rounded-lg py-3 text-sm font-bold text-white disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}
      >
        {isPending ? 'Verificando…' : 'Continuar a elegir plan →'}
      </button>

      <p className="text-[11px] text-white/40 text-center">
        Al registrarte aceptas los términos de uso y política de privacidad.
      </p>
    </form>
  );
}
