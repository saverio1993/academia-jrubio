'use client';

import { useState } from 'react';
import { getDownloadUrl } from './download-action';

const IconDown = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 12L2 6h4V1h4v5h4L8 12z"/>
    <rect x="1" y="13" width="14" height="2" rx="1"/>
  </svg>
);

const IconSpin = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ animation: 'spin 1s linear infinite' }}>
    <circle cx="8" cy="8" r="6" strokeOpacity=".3"/>
    <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/>
  </svg>
);

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
        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <IconSpin /> : <IconDown />}
        {loading ? 'Preparando…' : (label ?? 'Descargar archivo')}
      </button>
    );
  }

  if (blocked) {
    return (
      <a
        href="/planes"
        className={`rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20 ${
          fullWidth
            ? 'flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs'
            : 'inline-flex items-center px-2 py-0.5 text-[10px] whitespace-nowrap'
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
        title="Descargar"
        className={`inline-flex items-center justify-center gap-1 rounded font-medium text-white transition-colors disabled:opacity-50 ${
          fullWidth
            ? 'w-full py-2 px-3 text-sm gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'
            : 'px-2 py-0.5 text-[10px] whitespace-nowrap bg-[var(--color-accent)]/80 hover:bg-[var(--color-accent)]'
        }`}
      >
        {loading ? <IconSpin /> : <IconDown />}
        {fullWidth && (loading ? 'Preparando…' : 'Descargar')}
      </button>
      {error && (
        <p className="mt-1 text-[10px] text-red-400 leading-tight">
          {error}
        </p>
      )}
    </div>
  );
}
