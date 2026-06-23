'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MobileMenuProps {
  logged: boolean;
  role?: string;
}

export function MobileMenu({ logged, role }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      {/* Botón hamburguesa */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        className="flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-[var(--color-border)] transition-colors gap-[5px]"
      >
        <span
          className="block h-[2px] w-5 bg-[var(--color-fg)] transition-all duration-200 origin-center"
          style={open ? { transform: 'translateY(7px) rotate(45deg)' } : {}}
        />
        <span
          className="block h-[2px] w-5 bg-[var(--color-fg)] transition-all duration-200"
          style={open ? { opacity: 0 } : {}}
        />
        <span
          className="block h-[2px] w-5 bg-[var(--color-fg)] transition-all duration-200 origin-center"
          style={open ? { transform: 'translateY(-7px) rotate(-45deg)' } : {}}
        />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-14 left-0 right-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)] transition-all duration-200 overflow-hidden"
        style={{ maxHeight: open ? 400 : 0 }}
      >
        <nav className="flex flex-col px-4 py-3 gap-1">
          {logged ? (
            <>
              <Link
                href="/archivos"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-[var(--color-fg)] bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors"
              >
                📦 Archivos
              </Link>
              <Link
                href="/academia"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                🎓 Academia
              </Link>
              <Link
                href="/planes"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-yellow-300 hover:bg-[var(--color-card)] transition-colors"
              >
                ⭐ Suscripción
              </Link>
              {role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={close}
                  className="rounded-lg px-3 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-card)] transition-colors"
                >
                  Panel admin
                </Link>
              )}
            </>
          ) : (
            <>
              <a
                href="/#beneficios"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-card)] transition-colors"
              >
                Beneficios
              </a>
              <a
                href="/#planes"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-card)] transition-colors"
              >
                Planes
              </a>
              <Link
                href="/academia"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-card)] transition-colors"
              >
                Academia
              </Link>
              <div className="border-t border-[var(--color-border)] my-1" />
              <Link
                href="/signin"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-card)] transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/planes"
                onClick={close}
                className="rounded-lg px-3 py-3 text-sm font-medium text-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-colors"
              >
                Suscríbete
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
