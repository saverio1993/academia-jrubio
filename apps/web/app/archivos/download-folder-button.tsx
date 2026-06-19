'use client';

import { useState } from 'react';
import { downloadFolderZip } from './download-folder-action';

export function DownloadFolderButton({ folderPath, label }: { folderPath: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await downloadFolderZip(folderPath);
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg === 'NOT_AUTHENTICATED') {
        window.location.href = '/signin';
      } else if (msg === 'NO_SUBSCRIPTION') {
        window.location.href = '/planes';
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  }

  if (error) {
    return (
      <button
        onClick={handleDownload}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
        title={error}
      >
        ⚠ Reintentar ZIP
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20 disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading ? (
        <>
          <span className="inline-block animate-spin">⟳</span>
          Comprimiendo…
        </>
      ) : (
        <>📦 {label}</>
      )}
    </button>
  );
}
