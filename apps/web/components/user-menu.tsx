'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOutAction } from './sign-out-action';

interface Props {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

function initials(name: string | null, email: string | null): string {
  const source = (name || email || '?').trim();
  const parts = source.split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function UserMenu({ name, email, image, role }: Props) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative rounded-full p-0.5 transition-transform hover:scale-105 active:scale-95"
        aria-label="Menú de usuario"
      >
        {/* Anillo luminoso hover */}
        <span
          className={`absolute inset-0 rounded-full transition-all duration-300 ${
            hover || open
              ? 'opacity-100 scale-110 shadow-[0_0_20px_4px_rgba(249,115,22,0.5)]'
              : 'opacity-0 scale-100'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)',
          }}
        />
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name ?? 'avatar'}
            className={`relative w-9 h-9 rounded-full object-cover ring-2 transition-all ${
              hover || open ? 'ring-[var(--color-accent)]' : 'ring-transparent'
            }`}
          />
        ) : (
          <div
            className={`relative w-9 h-9 rounded-full bg-[var(--color-accent)] text-white text-xs font-semibold flex items-center justify-center ring-2 transition-all ${
              hover || open ? 'ring-[var(--color-accent)]' : 'ring-transparent'
            }`}
          >
            {initials(name, email)}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header con foto + nombre */}
          <div className="px-4 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={name ?? 'avatar'} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--color-accent)] text-white text-base font-semibold flex items-center justify-center">
                {initials(name, email)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{name ?? 'Usuario'}</p>
              <p className="text-xs text-[var(--color-muted)] truncate">{email}</p>
              {role === 'ADMIN' && (
                <span className="inline-block mt-1 rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                  Administrador
                </span>
              )}
            </div>
          </div>

          {/* Opciones */}
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
            >
              <span>📊</span>
              <div>
                <p className="font-medium">Mi cuenta</p>
                <p className="text-xs text-[var(--color-muted)]">Dashboard</p>
              </div>
            </Link>
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
            >
              <span>👤</span>
              <div>
                <p className="font-medium">Mi perfil</p>
                <p className="text-xs text-[var(--color-muted)]">Datos personales</p>
              </div>
            </Link>
            <Link
              href="/favoritos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
            >
              <span>🧡</span>
              <div>
                <p className="font-medium">Mis guardados</p>
                <p className="text-xs text-[var(--color-muted)]">Archivos favoritos</p>
              </div>
            </Link>
            <Link
              href="/mis-descargas"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
            >
              <span>📥</span>
              <div>
                <p className="font-medium">Mis descargas</p>
                <p className="text-xs text-[var(--color-muted)]">Historial completo</p>
              </div>
            </Link>
            <Link
              href="/perfil/seguridad"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
            >
              <span>🔒</span>
              <div>
                <p className="font-medium">Seguridad</p>
                <p className="text-xs text-[var(--color-muted)]">Contraseña y acceso</p>
              </div>
            </Link>
            {role === 'ADMIN' && (
              <>
                <div className="my-1 border-t border-[var(--color-border)]" />
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                >
                  <span>⚙️</span>
                  <div>
                    <p className="font-medium">Panel de control</p>
                    <p className="text-xs text-[var(--color-muted)]">Administración</p>
                  </div>
                </Link>
              </>
            )}
          </div>

          {/* Cerrar sesión */}
          <div className="border-t border-[var(--color-border)] py-1">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-500/10 text-red-400 transition-colors"
              >
                <span>🚪</span>
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
