'use client';

import { useActionState } from 'react';
import { createCoupon } from './actions';

export function CreateCouponForm() {
  const [state, action, pending] = useActionState(createCoupon, null);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 mb-8">
      <h2 className="text-sm font-semibold mb-4">Crear nuevo cupón</h2>
      <form action={action} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Código *</label>
          <input
            name="code"
            required
            placeholder="PROMO50"
            style={{ textTransform: 'uppercase' }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Descripción</label>
          <input
            name="description"
            placeholder="Promo lanzamiento"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Tipo *</label>
          <select
            name="type"
            required
            defaultValue="PERCENT"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="PERCENT">Porcentaje (%)</option>
            <option value="FIXED">Monto fijo (USD)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Valor * <span className="normal-case">(% o USD)</span></label>
          <input
            name="value"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="50"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Duración</label>
          <select
            name="duration"
            defaultValue="once"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="once">Solo primer pago</option>
            <option value="forever">Todos los pagos</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Máx. usos <span className="normal-case">(vacío = ilimitado)</span></label>
          <input
            name="maxUses"
            type="number"
            min="1"
            placeholder="100"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="text-[11px] text-[var(--color-muted)] font-medium uppercase tracking-wide">Fecha de expiración</label>
          <input
            name="expiresAt"
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--color-accent)] text-white px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? 'Creando…' : 'Crear cupón'}
          </button>
          {state && (
            <p className={`text-sm ${state.ok ? 'text-green-400' : 'text-red-400'}`}>
              {state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
