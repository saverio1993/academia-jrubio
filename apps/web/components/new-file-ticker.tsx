import { Suspense } from 'react';
import { prisma } from '@academia/db';

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

async function TickerContent() {
  let files: { id: string; title: string; brand: string; category: string }[] = [];

  try {
    const recent = await prisma.fileItem.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 45 * 24 * 3600 * 1000) } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, brand: true, category: true },
    });

    files = recent.length >= 4
      ? recent
      : await prisma.fileItem.findMany({
          orderBy: { createdAt: 'desc' },
          take: 18,
          select: { id: true, title: true, brand: true, category: true },
        });
  } catch {
    return null;
  }

  if (files.length === 0) return null;

  // Triple para que el loop sea completamente invisible
  const items = [...files, ...files, ...files];

  return (
    <div className="ticker-wrap relative w-full overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)]" style={{ height: '36px' }}>

      {/* Etiqueta fija izquierda */}
      <div className="absolute left-0 top-0 z-20 flex h-full items-center gap-1.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-hover)] px-3 shrink-0 shadow-[2px_0_8px_rgba(249,115,22,0.4)]">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
          Nuevos
        </span>
      </div>

      {/* Fade izquierdo (tras la etiqueta) */}
      <div
        className="absolute top-0 z-10 h-full w-12 pointer-events-none"
        style={{ left: '82px', background: 'linear-gradient(to right, var(--color-card), transparent)' }}
      />

      {/* Fade derecho */}
      <div
        className="absolute right-0 top-0 z-10 h-full w-16 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--color-card), transparent)' }}
      />

      {/* Track animado */}
      <div className="absolute left-[90px] right-0 top-0 h-full overflow-hidden flex items-center">
        <div className="ticker-track inline-flex items-center whitespace-nowrap">
          {items.map((f, i) => (
            <span key={`${f.id}-${i}`} className="inline-flex items-center gap-2 px-5">
              {/* Badge NUEVO */}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-1.5 py-[2px] text-[9px] font-bold text-[var(--color-accent)] uppercase tracking-widest leading-none">
                ✦ nuevo
              </span>
              {/* Icono de categoría */}
              <span className="text-[12px] leading-none">{CAT_ICON[f.category] ?? '📄'}</span>
              {/* Nombre del archivo */}
              <span className="text-[12px] font-semibold text-[var(--color-fg)] max-w-[200px] truncate">
                {f.title}
              </span>
              {/* Marca */}
              <span className="text-[11px] text-[var(--color-muted)]">{f.brand}</span>
              {/* Separador */}
              <span className="text-[var(--color-border)] select-none text-sm">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NewFileTicker() {
  return (
    <Suspense fallback={<div style={{ height: '36px' }} />}>
      <TickerContent />
    </Suspense>
  );
}
