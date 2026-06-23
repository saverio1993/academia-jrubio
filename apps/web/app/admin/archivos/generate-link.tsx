'use client';

import { useActionState, useRef } from 'react';
import { generateOneTimeLink } from './actions';
import { inputCls } from '../_components/ui';

export function GenerateLink({ fileId }: { fileId: string }) {
  const [result, action, pending] = useActionState(generateOneTimeLink, null);
  const inputRef = useRef<HTMLInputElement>(null);

  function copyUrl() {
    if (!result?.url) return;
    navigator.clipboard.writeText(result.url);
    if (inputRef.current) {
      inputRef.current.select();
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
      <p className="mb-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
        Link de descarga de un solo uso
      </p>
      <form action={action} className="flex flex-wrap gap-2 items-end">
        <input type="hidden" name="fileId" value={fileId} />
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--color-muted)]">Nota (para quién)</span>
          <input name="note" placeholder="Ej: Cliente Juan Pérez" className={inputCls + ' w-48'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--color-muted)]">Válido (días)</span>
          <input name="days" type="number" defaultValue="7" min="1" max="30" className={inputCls + ' w-24'} />
        </label>
        <button
          disabled={pending}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {pending ? 'Generando…' : '🔗 Generar link'}
        </button>
      </form>

      {result?.url && (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={inputRef}
            readOnly
            value={result.url}
            className={inputCls + ' flex-1 font-mono text-xs'}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyUrl}
            className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs hover:bg-white/5 transition-colors"
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  );
}
