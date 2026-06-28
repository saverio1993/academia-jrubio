'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/tg',          label: 'Inicio',   icon: '🏠' },
  { href: '/tg/archivos', label: 'Archivos', icon: '📁' },
  { href: '/tg/ia',       label: 'IA',       icon: '🤖' },
  { href: '/tg/comunidad',label: 'Foro',     icon: '💬' },
];

export function TgNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--color-border)]"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="grid grid-cols-4 h-16">
        {TABS.map((tab) => {
          const active =
            tab.href === '/tg'
              ? path === '/tg'
              : path.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
