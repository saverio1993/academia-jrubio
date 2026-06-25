'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { DownloadButton } from './download-button';

interface FileHit {
  id: string;
  title: string;
  brand: string;
  model: string | null;
  category: string;
  storageKey: string;
  sizeBytes: number | null;
  isPremium: boolean;
  exactMatch?: boolean;
}

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};
const BRAND_EMOJI: Record<string, string> = {
  samsung: '🌀', xiaomi: '🔶', motorola: '〽️', huawei: '🌸',
  honor: '🏅', oppo: '🔷', vivo: '🎵', tecno: '🔆', infinix: '⚡',
  google: '🔍', apple: '🍎', lg: '🔵', other: '📱',
};

function brandEmoji(brand: string): string {
  return BRAND_EMOJI[brand.toLowerCase()] ?? '📱';
}
function bytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function SmartSearch({ userId, hasSub }: { userId: string; hasSub: boolean }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<FileHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/chat/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      const hits: FileHit[] = (data.files ?? data.results ?? data ?? []).map((f: FileHit & { sizeBytes?: number | bigint | string | null }) => ({
        ...f,
        sizeBytes: f.sizeBytes != null ? Number(f.sizeBytes) : null,
      }));
      setResults(hits.slice(0, 12));
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => search(v), 280);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Agrupar por marca
  const grouped = results.reduce<Record<string, FileHit[]>>((acc, f) => {
    const k = f.brand || 'Otros';
    if (!acc[k]) acc[k] = [];
    acc[k].push(f);
    return acc;
  }, {});

  const showPanel = open && (results.length > 0 || loading);

  return (
    <div ref={wrapperRef} className="relative w-full mb-6">
      {/* Barra de búsqueda visual */}
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200 bg-[var(--color-card)] ${
          focused
            ? 'border-[var(--color-accent)] shadow-[0_0_0_3px_rgba(var(--color-accent-rgb,251,146,60),0.15)]'
            : 'border-[var(--color-border)]'
        }`}
      >
        <span className="text-xl shrink-0">{loading ? '⟳' : '🔍'}</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => { setFocused(true); if (results.length) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Modelo, firmware, FRP, número de parte (ej: ELI-NX9, SM-A556B)…"
          className="flex-1 bg-transparent text-sm font-medium placeholder-[var(--color-muted)] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-fg)] text-lg leading-none transition-colors"
          >
            ✕
          </button>
        )}
        {!query && (
          <span className="shrink-0 text-xs text-[var(--color-muted)] hidden sm:inline">
            Búsqueda inteligente
          </span>
        )}
      </div>

      {/* Panel de resultados */}
      {showPanel && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-[var(--color-muted)]">
              <span className="animate-spin text-lg">⟳</span> Buscando…
            </div>
          )}

          {Object.entries(grouped).map(([brand, files]) => (
            <div key={brand}>
              {/* Encabezado de marca */}
              <div className="sticky top-0 flex items-center gap-2 px-4 py-2 bg-[var(--color-card)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
                <span className="text-base">{brandEmoji(brand)}</span>
                <span className="text-xs font-bold tracking-wide uppercase text-[var(--color-muted)]">{brand}</span>
                <span className="ml-auto text-[10px] text-[var(--color-muted)]">{files.length} archivo{files.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Archivos de la marca */}
              <div className="divide-y divide-[var(--color-border)]/40">
                {files.map((f) => {
                  const blocked = f.isPremium && !hasSub;
                  const icon    = CAT_ICON[f.category] ?? '📄';
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Icono de categoría */}
                      <span
                        title={f.category}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-base"
                      >
                        {icon}
                      </span>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-[var(--color-fg)] truncate max-w-[200px]">{f.title}</span>
                          {f.exactMatch && (
                            <span className="shrink-0 rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wide">🎯 Exacto</span>
                          )}
                          {f.isPremium && (
                            <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-accent)] uppercase tracking-wide">PRO</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-muted)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {f.model && <span>{f.model}</span>}
                          {f.model && f.sizeBytes && <span>·</span>}
                          {f.sizeBytes ? <span>{bytes(f.sizeBytes)}</span> : null}
                          <span className="capitalize text-[10px] opacity-70">{f.category}</span>
                        </p>
                      </div>

                      {/* Botón de descarga */}
                      <div className="shrink-0">
                        <DownloadButton
                          fileId={f.id}
                          storageKey={f.storageKey}
                          blocked={blocked}
                          userId={userId}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="py-8 text-center text-sm text-[var(--color-muted)]">
              <p className="text-2xl mb-2">🔎</p>
              <p>Sin resultados para <strong className="text-[var(--color-fg)]">&ldquo;{query}&rdquo;</strong></p>
              <p className="text-xs mt-1">Intenta con otra palabra clave o pregunta al asistente IA →</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--color-border)] text-[10px] text-[var(--color-muted)] flex items-center justify-between">
              <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
