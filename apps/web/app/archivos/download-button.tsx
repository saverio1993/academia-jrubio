'use client';

import { useState } from 'react';
import { downloadFile } from './download-action';

export function DownloadButton({
  fileId,
  storageKey,
  blocked,
  userId,
}: {
  fileId: string;
  storageKey: string;
  blocked: boolean;
  userId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (blocked) return;
    setLoading(true);
    try {
      await downloadFile(fileId, storageKey, userId);
    } finally {
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
        <>
          ⬇ Descargar
        </>
      )}
    </button>
  );
}
