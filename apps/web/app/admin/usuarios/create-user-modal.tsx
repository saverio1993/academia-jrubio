'use client';

import { useState, useEffect, useActionState } from 'react';
import { createUser } from './actions';
import { inputCls, btnPrimary, btnGhost } from '../_components/ui';

type Plan = { id: string; name: string; billingCycle: string };
type State = { ok: boolean; message: string } | null;

export function CreateUserModal({ plans }: { plans: Plan[] }) {
  const [open, setOpen]       = useState(false);
  const [planSel, setPlanSel] = useState('');
  const [state, formAction, pending] = useActionState<State, FormData>(createUser, null);

  // Cerrar modal al guardar con éxito
  useEffect(() => {
    if (state?.ok) { setOpen(false); setPlanSel(''); }
  }, [state]);

  const today       = new Date().toISOString().split('T')[0]!;
  const needsDate   = planSel !== '' && planSel !== 'none';

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        + Agregar usuario
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-y-auto max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 sticky top-0 bg-[var(--color-card)]">
            <h2 className="text-base font-semibold">Agregar usuario</h2>
            <button
              onClick={() => { setOpen(false); setPlanSel(''); }}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)] text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form action={formAction} className="p-6 space-y-4">

            {/* Info de acceso */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-xs text-blue-300 leading-relaxed">
              El usuario ingresará normalmente con su correo de Google. Simplemente regístralo aquí y listo — cuando él inicie sesión por primera vez su cuenta quedará activa.
            </div>

            {/* Email */}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">
                Correo electrónico <span className="text-red-400">*</span>
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="usuario@gmail.com"
                className={inputCls}
              />
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                Debe ser el correo exacto con el que iniciará sesión en Google.
              </p>
            </label>

            {/* Nombre */}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Nombre (opcional)</span>
              <input name="name" type="text" placeholder="Nombre completo" className={inputCls} />
            </label>

            {/* Rol */}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">
                Rol <span className="text-red-400">*</span>
              </span>
              <select name="role" defaultValue="USER" className={inputCls}>
                <option value="USER">USER — acceso estándar</option>
                <option value="MODERATOR">MODERATOR — gestión parcial</option>
                <option value="ADMIN">ADMIN — acceso completo</option>
              </select>
            </label>

            {/* ── Suscripción ── */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                Suscripción
              </p>

              {/* Plan */}
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-muted)]">Plan</span>
                <select
                  name="planId"
                  value={planSel}
                  onChange={e => setPlanSel(e.target.value)}
                  className={inputCls}
                >
                  <option value="none">— Sin suscripción —</option>
                  <option value="gratis">🎁 Gratis (acceso completo)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.billingCycle}
                    </option>
                  ))}
                </select>
              </label>

              {/* Fecha de vencimiento — solo si hay plan */}
              {needsDate && (
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-muted)]">
                    Vence el <span className="text-red-400">*</span>
                  </span>
                  <input
                    name="expiresAt"
                    type="date"
                    min={today}
                    required
                    className={inputCls}
                  />
                </label>
              )}
            </div>

            {/* Error */}
            {state && !state.ok && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                ⚠ {state.message}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={pending} className={btnPrimary + ' flex-1'}>
                {pending ? 'Guardando…' : 'Crear usuario'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setPlanSel(''); }}
                className={btnGhost}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
