'use client';

import { useState, useTransition } from 'react';
import { submitReport } from './report-action';

const REASONS = [
  { value: 'danado',            label: 'Archivo dañado / corrupto' },
  { value: 'no_compatible',     label: 'No compatible con mi equipo' },
  { value: 'version_incorrecta',label: 'Versión incorrecta' },
  { value: 'enlace_roto',       label: 'No se puede descargar' },
  { value: 'otro',              label: 'Otro motivo' },
];

export function ReportButton({ fileItemId, fileTitle }: { fileItemId: string; fileTitle: string }) {
  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState('danado');
  const [comment, setComment] = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [pending, start]      = useTransition();

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    start(async () => {
      const res = await submitReport({ fileItemId, reason, comment: comment.trim() || undefined });
      if (res.ok) { setSent(true); }
      else        { setError(res.error); }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="Reportar problema"
        className="inline-flex items-center justify-center w-5 h-5 rounded transition-colors text-[rgba(255,255,255,0.2)] hover:text-orange-400"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {sent ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-3xl">✅</p>
                <p className="font-semibold">Reporte enviado</p>
                <p className="text-sm text-[var(--color-muted)]">El equipo lo revisará pronto. Gracias.</p>
                <button
                  onClick={() => { setOpen(false); setSent(false); }}
                  className="mt-2 rounded-lg bg-[var(--color-accent)] text-white px-5 py-2 text-sm font-medium"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm">Reportar problema</h3>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5 truncate">{fileTitle}</p>
                </div>

                <div className="space-y-1.5">
                  {REASONS.map(r => (
                    <label key={r.value} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio" name="reason" value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-[var(--color-accent)]"
                      />
                      <span className="text-xs group-hover:text-[var(--color-fg)] transition-colors">{r.label}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Detalles adicionales (opcional)…"
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs resize-none focus:outline-none focus:border-[var(--color-accent)]"
                />

                {error && <p className="text-xs text-red-400">⚠ {error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-[var(--color-border)] py-2 text-xs hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex-1 rounded-lg bg-orange-500/90 hover:bg-orange-500 text-white py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {pending ? 'Enviando…' : 'Enviar reporte'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
