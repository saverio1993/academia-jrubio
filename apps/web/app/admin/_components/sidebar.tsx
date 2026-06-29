'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const GROUPS = [
  {
    label: null,
    items: [
      { href: '/admin', label: '🏠 Dashboard', exact: true },
    ],
  },
  {
    label: 'Usuarios',
    items: [
      { href: '/admin/usuarios',      label: 'Usuarios' },
      { href: '/admin/suscripciones', label: 'Suscripciones' },
      { href: '/admin/pagos',         label: 'Pagos' },
      { href: '/admin/cupones',       label: 'Cupones' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { href: '/admin/archivos',  label: 'Archivos' },
      { href: '/admin/cursos',    label: 'Cursos' },
      { href: '/admin/comunidad', label: 'Comunidad' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/planes', label: 'Planes' },
      { href: '/admin/links',  label: 'Links únicos' },
      { href: '/admin/ia',     label: 'Asistente IA' },
      { href: '/admin/bot',    label: '🤖 Bot Telegram' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { href: '/admin/stats',    label: 'Estadísticas' },
      { href: '/admin/reportes', label: 'Reportes' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row flex-wrap gap-1 md:flex-col md:gap-0">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="contents md:block md:mb-3">
          {group.label && (
            <p className="hidden md:block px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest"
               style={{ color: 'var(--color-muted)' }}>
              {group.label}
            </p>
          )}
          {group.items.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-fg)]'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
