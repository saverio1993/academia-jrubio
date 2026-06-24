'use client';

import { useState, useEffect, useActionState } from 'react';
import { createUser } from './actions';
import { inputCls, btnPrimary, btnGhost } from '../_components/ui';

type Plan = { id: string; name: string; billingCycle: string };
type State = { ok: boolean; message: string } | null;

export function CreateUserModal({ plans }: { plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<State, FormData>(createUser, null);

  // Cerrar al éxito
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  // Fecha mínima = hoy
  const today = new Date().toISOString().split('T')[0];

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
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="text-base font-semibold">Agregar usuario</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)] text-lg leading-none transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form action={formAction} className="p-6 space-y-4">
            {/* Email */}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">
                Correo electrónico <span className="text-red-400">*</span>
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="usuario@ejemplo.com"
                className={inputCls}
              />
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                Si el correo ya existe, solo se actualizará el rol y la suscripción.
              </p>
            </label>

            {/* Nombre */}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">Nombre (opcional)</span>
              <input
                name="name"
                type="text"
                placeholder="Nombre completo"
                className={inputCls}
              />
            </label>

            {/* Rol */}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-muted)]">
                Rol <span className="text-red-400">*</span>
              </span>
              <select name="role" defaultValue="USER" className={inputCls}>
                <option value="USER">USER — acceso estándar</option>
                <option value="MODERATOR">MODERATOR — sin admin total</option>
                <option value="ADMIN">ADMIN — acceso completo</option>
              </select>
            </label>

            {/* Separador suscripción */}
            <div className="border-t border-[var(--color-border)] pt-2">
              <p className="text-xs font-medium text-[var(--color-muted)] mb-3">
                Suscripción (opcional)
              </p>

              {/* Plan */}
              {plans.length > 0 ? (
                <label className="block mb-3">
                  <span className="mb-1 block text-xs text-[var(--color-muted)]">Plan</span>
                  <select name="planId" className={inputCls} defaultValue="">
                    <option value="">— Sin suscripción —</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.billingCycle})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  No hay planes activos. Crea un plan primero.
                </p>
              )}

              {/* Fecha de vencimiento */}
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-muted)]">
                  Fecha de vencimiento
                </span>
                <input
                  name="expiresAt"
                  type="date"
                  min={today}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                  Requerida si seleccionas un plan.
                </p>
              </label>
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
                onClick={() => setOpen(false)}
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
