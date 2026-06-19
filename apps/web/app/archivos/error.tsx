'use client';

import { useEffect } from 'react';

export default function ArchivosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Archivos error]', error);
  }, [error]);

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <h1 className="text-2xl font-bold text-red-400 mb-2">Error al cargar la biblioteca</h1>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          {error.message || 'Algo salió mal al renderizar la página.'}
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--color-muted)] mb-4 font-mono">
            digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
