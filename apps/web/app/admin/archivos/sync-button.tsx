'use client';

import { useState } from 'react';
import { syncFromNextcloud, SyncResult } from './actions';

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<SyncResult | null>(null);
  const [error,   setError]   = useState('');

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await syncFromNextcloud();
      setResult(res);
    } catch (e) {
      setError((e as Error).message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={loading}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-muted)] border-t-white" />
              Sincronizando (limpieza completa)…
            </>
          ) : (
            '↻ Sincronizar y limpiar desde Nextcloud'
          )}
        </button>
        {loading && (
          <span className="text-xs text-[var(--color-muted)]">Esto puede tardar unos segundos…</span>
        )}
      </div>

      {result && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-green-400">✓ Sincronización completa</p>
          <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-muted)]">
            <li>Eliminados de BD (rutas inválidas): <span className="text-red-300 font-medium">{result.deleted}</span></li>
            <li>Archivos nuevos agregados: <span className="text-green-300 font-medium">{result.added}</span></li>
            <li>Actualizados: <span className="text-[var(--color-fg)]">{result.updated}</span></li>
            <li>Ignorados (ext. no válida, etc.): <span className="text-[var(--color-fg)]">{result.skipped}</span></li>
            {result.errors.length > 0 && (
              <li className="text-red-400">Errores: {result.errors.length} — {result.errors[0]}</li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
