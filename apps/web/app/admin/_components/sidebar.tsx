'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/pagos', label: 'Pagos' },
  { href: '/admin/suscripciones', label: 'Suscripciones' },
  { href: '/admin/planes', label: 'Planes' },
  { href: '/admin/archivos', label: 'Archivos' },
  { href: '/admin/cursos', label: 'Cursos' },
  { href: '/admin/ia', label: 'Asistente de IA' },
  { href: '/admin/stats', label: 'Estadísticas' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {LINKS.map((l) => {
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
    </nav>
  );
}
