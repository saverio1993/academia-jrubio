'use client';

import { useState } from 'react';
import { downloadFolderZip } from './download-folder-action';

export function DownloadFolderButton({
  folderPath,
  label,
  asMenuItem,
}: {
  folderPath: string;
  label: string;
  asMenuItem?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const result = await downloadFolderZip(folderPath);
      if (!result.ok) {
        if (result.code === 'NOT_AUTHENTICATED') { window.location.href = '/signin'; return; }
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
        {label}
      </button>
    );
  }

  return (
    <div className="inline-block">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:opacity-50"
      >
        {loading ? '⟳ Preparando…' : label}
      </button>
      {error && <p className="mt-0.5 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
