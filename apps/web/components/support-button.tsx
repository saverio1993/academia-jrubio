'use client';

import { useState } from 'react';

const SUPPORT_EMAIL = 'saveriomanrrique19@gmail.com';

export function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip / mini card */}
      {open && (
        <div
          className="rounded-2xl border p-4 shadow-xl w-64 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-fg)' }}>
            ¿Necesitas ayuda?
          </p>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Para dudas sobre planes, pagos o suscripciones escríbenos directamente.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Soporte%20Academia%20J%20Rubio&body=Hola%2C%20necesito%20ayuda%20con%3A%0A%0A`}
            className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
            onClick={() => setOpen(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Enviar email de soporte
          </a>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--color-muted)' }}>
            {SUPPORT_EMAIL}
          </p>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Soporte"
        className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ background: 'var(--color-accent)' }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <path d="M12 17h.01"/>
            </svg>
            <span>Soporte</span>
          </>
        )}
      </button>
    </div>
  );
}
