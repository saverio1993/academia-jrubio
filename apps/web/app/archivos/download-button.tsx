'use client';

import { useState } from 'react';
import { getDownloadUrl } from './download-action';

export function DownloadButton({
  fileId,
  blocked,
  asMenuItem,
  fullWidth,
  label,
}: {
  fileId: string;
  storageKey: string;
  blocked: boolean;
  userId: string;
  asMenuItem?: boolean;
  fullWidth?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleDownload() {
    if (blocked) { window.location.href = '/planes'; return; }
    setLoading(true);
    setError(null);
    try {
      const result = await getDownloadUrl(fileId);
      if (!result.ok) {
        if (result.code === 'NOT_AUTHENTICATED') { window.location.href = '/signin?callbackUrl=/archivos'; return; }
        if (result.code === 'NO_SUBSCRIPTION')   { window.location.href = '/planes'; return; }
        setError(result.message);
        return;
      }
      window.open(result.url, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  if (asMenuItem) {
    return (
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
      >
        {loading ? '⟳ Preparando…' : (label ?? '⬇ Descargar archivo')}
      </button>
    );
  }

  if (blocked) {
    return (
      <a
        href="/planes"
        className={`rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-xs font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20 ${
          fullWidth ? 'flex items-center justify-center w-full py-2 px-3' : 'px-3 py-1.5 whitespace-nowrap'
        }`}
      >
        {label ?? 'PRO'}
      </a>
    );
  }

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`rounded-lg bg-[var(--color-accent)] font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 ${
          fullWidth
            ? 'w-full flex items-center justify-center gap-2 py-2 px-3 text-sm'
            : 'px-3 py-1.5 text-xs whitespace-nowrap'
        }`}
      >
        {loading ? '⟳ Preparando…' : (fullWidth ? (label ?? '⬇ Descargar') : '⬇')}
      </button>
      {error && (
        <p className="mt-1 text-[10px] text-red-400 leading-tight">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
