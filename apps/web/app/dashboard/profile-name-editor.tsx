'use client';

import { useState } from 'react';
import { updateOwnName } from './actions';

export function ProfileNameEditor({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(initialName);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('name', name);
    const result = await updateOwnName(fd);
    setMsg(result);
    setSaving(false);
    if (result.ok) {
      setEditing(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div>
      {editing ? (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xl font-bold outline-none focus:border-[var(--color-accent)] w-56"
            autoFocus
          />
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? '…' : 'Guardar'}
          </button>
          <button
            onClick={() => { setEditing(false); setName(initialName); }}
            className="text-sm text-[var(--color-muted)] hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 group">
          <h1 className="text-3xl font-bold">{name}</h1>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-all border border-[var(--color-border)] rounded px-2 py-0.5"
          >
            Editar nombre
          </button>
        </div>
      )}
      {msg && (
        <p className={`text-xs mt-1 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
          {msg.ok ? '✓ ' : '⚠ '}{msg.text}
        </p>
      )}
    </div>
  );
}
