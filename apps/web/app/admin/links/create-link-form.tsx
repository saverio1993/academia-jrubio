'use client';

import { useActionState, useState } from 'react';
import { createLink } from './actions';

interface FileOption { id: string; title: string; brand: string }

export function CreateLinkForm({ files }: { files: FileOption[] }) {
  const [state, action, pending] = useActionState(createLink, null);
  const [search, setSearch]      = useState('');

  const filtered = files.filter(f =>
    !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.brand.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  return (
    <form action={action} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4 max-w-lg">
      <h3 className="font-semibold text-sm">Crear link de un solo uso</h3>

      <div>
        <label className="block text-xs text-[var(--color-muted)] mb-1">Buscar archivo</label>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Escribe para filtrar…"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--color-muted)] mb-1">Archivo *</label>
        <select name="fileItemId" required className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none">
          <option value="">— Selecciona —</option>
          {filtered.map(f => (
            <option key={f.id} value={f.id}>{f.brand} · {f.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--color-muted)] mb-1">Vence en</label>
          <select name="hours" defaultValue="24" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none">
            <option value="1">1 hora</option>
            <option value="6">6 horas</option>
            <option value="24">24 horas</option>
            <option value="72">3 días</option>
            <option value="168">7 días</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--color-muted)] mb-1">Nota (opcional)</label>
          <input name="note" placeholder="Para quién es…" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none" />
        </div>
      </div>

      {state && (
        <p className={`text-xs ${state.ok ? 'text-green-400' : 'text-red-400'}`}>
          {state.ok ? '✓' : '⚠'} {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="rounded-lg bg-[var(--color-accent)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
        {pending ? 'Creando…' : 'Crear link'}
      </button>
    </form>
  );
}
