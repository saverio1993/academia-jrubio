'use client';

import { useState } from 'react';
import { getDownloadUrl } from './download-action';

export function DownloadButton({
  fileId,
  blocked,
}: {
  fileId: string;
  storageKey: string;
  blocked: boolean;
  userId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (blocked) return;
    setLoading(true);
    setError(null);
    try {
      const { url } = await getDownloadUrl(fileId);
      // Redirigir en el cliente a la URL de Nextcloud
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg === 'NOT_AUTHENTICATED') {
        window.location.href = '/signin?callbackUrl=/archivos';
      } else if (msg === 'NO_SUBSCRIPTION') {
        window.location.href = '/planes';
      } else {
        setError(msg);
        console.error('Download error:', e);
      }
      setLoading(false);
    }
  }

  if (blocked) {
    return (
      <a
        href="/planes"
        className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20 whitespace-nowrap"
      >
        Requiere plan
      </a>
    );
  }

  if (error) {
    return (
      <button
        onClick={handleDownload}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 whitespace-nowrap"
        title={error}
      >
        ⚠ Reintentar
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
    >
      {loading ? (
        <>
          <span className="inline-block animate-spin">⟳</span>
          Generando…
        </>
      ) : (
        <>⬇ Descargar</>
      )}
    </button>
  );
}
