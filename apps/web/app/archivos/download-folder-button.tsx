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

  async function handleDownload() {
    setLoading(true);
    try {
      const { url } = await downloadFolderZip(folderPath);
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      if (msg === 'NOT_AUTHENTICATED') window.location.href = '/signin';
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
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:opacity-50"
    >
      {loading ? '⟳ Preparando…' : label}
    </button>
  );
}
