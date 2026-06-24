'use client';

import { useEffect, useState, useCallback } from 'react';

interface TickerFile {
  id: string;
  title: string;
  brand: string;
  category: string;
  createdAt: string;
}

const CAT_ICON: Record<string, string> = {
  firmware:     '💾',
  drivers:      '🔧',
  frp:          '🔓',
  root:         '⚡',
  dump:         '💿',
  tutoriales:   '📖',
  herramientas: '🛠',
  unlock:       '🔑',
};

const REFRESH_MS = 10 * 60 * 1000; // 10 minutos

export function NewFileTicker() {
  const [files, setFiles] = useState<TickerFile[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ticker', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as { files: TickerFile[] };
      if (data.files?.length) setFiles(data.files);
    } catch { /* silencioso */ }
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Placeholder del mismo alto mientras carga
  if (!ready || files.length === 0) return <div style={{ height: '36px' }} />;

  const items = [...files, ...files, ...files];

  return (
    <div
      className="ticker-wrap relative w-full overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)]"
      style={{ height: '36px' }}
    >
      {/* Etiqueta fija */}
      <div className="absolute left-0 top-0 z-20 flex h-full items-center gap-1.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-3 shrink-0 shadow-[2px_0_8px_rgba(249,115,22,0.4)]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
          Nuevos
        </span>
      </div>

      {/* Fade izquierdo */}
      <div
        className="absolute top-0 z-10 h-full w-12 pointer-events-none"
        style={{ left: '82px', background: 'linear-gradient(to right, var(--color-card), transparent)' }}
      />

      {/* Fade derecho */}
      <div
        className="absolute right-0 top-0 z-10 h-full w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--color-card), transparent)' }}
      />

      {/* Track */}
      <div className="absolute left-[90px] right-0 top-0 h-full overflow-hidden flex items-center">
        <div className="ticker-track inline-flex items-center whitespace-nowrap">
          {items.map((f, i) => (
            <span key={`${f.id}-${i}`} className="inline-flex items-center gap-2 px-5">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-[2px] text-[9px] font-bold text-[var(--color-accent)] uppercase tracking-widest leading-none">
                ✦ nuevo
              </span>
              <span className="text-[12px] leading-none">{CAT_ICON[f.category] ?? '📄'}</span>
              <span className="text-[12px] font-semibold text-[var(--color-fg)] max-w-[200px] truncate">
                {f.title}
              </span>
              <span className="text-[11px] text-[var(--color-muted)]">{f.brand}</span>
              <span className="text-[var(--color-border)] select-none text-sm">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
