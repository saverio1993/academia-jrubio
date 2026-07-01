'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; exact?: boolean; external?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: '/admin', label: 'Dashboard', exact: true },
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
      { href: '/admin/live',      label: 'Live' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/admin/planes', label: 'Planes' },
      { href: '/admin/links',  label: 'Links únicos' },
      { href: '/admin/ia',     label: 'Asistente IA' },
      { href: '/admin/bot',    label: 'Bot Telegram' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { href: '/api/admin/video-tool-token', label: 'Descargador de Videos ↗', external: true },
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

  const linkClass = (active: boolean) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap border-l-2 ${
      active
        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] pl-4'
        : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)] hover:pl-4'
    }`;

  return (
    <>
      {/* ── Desktop: sidebar vertical ── */}
      <nav className="hidden md:flex flex-col gap-4">
        {GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <div className="flex items-center gap-2 mb-2 px-1">
                <span
                  className="h-px flex-1"
                  style={{ background: 'var(--color-border)' }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest px-1"
                  style={{ color: 'var(--color-accent)', opacity: 0.85 }}
                >
                  {group.label}
                </span>
                <span
                  className="h-px flex-1"
                  style={{ background: 'var(--color-border)' }}
                />
              </div>
            ) : (
              gi > 0 && <div className="h-px mb-2" style={{ background: 'var(--color-border)' }} />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((l) =>
                l.external ? (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass(false)}>
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={linkClass(l.exact ? pathname === l.href : pathname.startsWith(l.href))}
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Mobile: barra horizontal con separadores ── */}
      <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-1 shrink-0">
            {gi > 0 && (
              <span className="h-4 w-px mx-1 shrink-0"
                    style={{ background: 'var(--color-border)' }} />
            )}
            {group.items.map((l) =>
              l.external ? (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass(false)}>
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  className={linkClass(l.exact ? pathname === l.href : pathname.startsWith(l.href))}
                >
                  {l.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
