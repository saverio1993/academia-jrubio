'use client';

import { useState } from 'react';
import { getDownloadUrl } from './download-action';

export function DownloadButton({
  fileId,
  blocked,
  asMenuItem,
  label,
}: {
  fileId: string;
  storageKey: string;
  blocked: boolean;
  userId: string;
  asMenuItem?: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (blocked) {
      window.location.href = '/planes';
      return;
    }
    setLoading(true);
    try {
      const { url } = await getDownloadUrl(fileId);
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      if (msg === 'NOT_AUTHENTICATED') window.location.href = '/signin?callbackUrl=/archivos';
      else if (msg === 'NO_SUBSCRIPTION') window.location.href = '/planes';
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
        {label ?? '⬇ Descargar archivo'}
      </button>
    );
  }

  if (blocked) {
    return (
      <a
        href="/planes"
        className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20 whitespace-nowrap"
      >
        PRO
      </a>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? '⟳' : '⬇'}
    </button>
  );
}
