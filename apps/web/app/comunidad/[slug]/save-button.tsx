'use client';

import { useState, useTransition } from 'react';
import { toggleSavePost } from './actions';

export function SaveButton({ slug, initialSaved }: { slug: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();

  function handleClick() {
    start(async () => {
      setSaved((v) => !v);
      try { await toggleSavePost(slug); }
      catch { setSaved((v) => !v); }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={saved ? 'Quitar de guardados' : 'Guardar post'}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-50"
      style={
        saved
          ? { background: 'rgba(249,115,22,0.12)', color: 'var(--color-accent)', borderColor: 'rgba(249,115,22,0.35)' }
          : { background: 'var(--color-card)', color: 'var(--color-muted)', borderColor: 'var(--color-border)' }
      }
    >
      {saved ? '🔖 Guardado' : '🔖 Guardar'}
    </button>
  );
}
