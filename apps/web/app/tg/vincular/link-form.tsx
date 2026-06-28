'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export function LinkForm() {
  const router = useRouter();
  const [tgUser, setTgUser] = useState<TgUser | null>(null);
  const [initData, setInitData] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const data =
      window.Telegram?.WebApp?.initData ??
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('tg_init_data') ?? '' : '');
    setInitData(data);

    const raw = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (raw) setTgUser(raw as TgUser);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initData) {
      setError('No se detectó sesión de Telegram. Abre esta página desde el bot.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/link-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, email, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error al vincular cuenta');
        return;
      }

      setSuccess(true);

      // Auto sign in and redirect
      const signInRes = await signIn('telegram', { initData, redirect: false });
      if (signInRes?.ok) {
        router.push('/tg');
        router.refresh();
      } else {
        router.push('/tg');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-2">
        <div className="text-5xl">🎉</div>
        <p className="font-bold text-sm">¡Cuenta vinculada!</p>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Redirigiendo…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Telegram user info */}
      {tgUser && (
        <div
          className="flex items-center gap-3 rounded-2xl p-4 border border-[var(--color-border)]"
          style={{ background: 'var(--color-card)' }}
        >
          {tgUser.photo_url ? (
            <img src={tgUser.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: 'rgba(0,136,204,0.15)', color: '#0088cc' }}
            >
              {tgUser.first_name[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">
              {tgUser.first_name} {tgUser.last_name ?? ''}
            </p>
            {tgUser.username && (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                @{tgUser.username}
              </p>
            )}
          </div>
          <span className="ml-auto text-xl">✅</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>
            Correo de tu cuenta
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          {error}
        </p>
      )}

      {!initData && (
        <p className="text-xs text-amber-400 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          ⚠️ Abre esta página desde el bot de Telegram para vincular tu cuenta.
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !initData}
        className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-accent)' }}
      >
        {loading ? 'Vinculando…' : 'Vincular cuenta'}
      </button>
    </form>
  );
}
