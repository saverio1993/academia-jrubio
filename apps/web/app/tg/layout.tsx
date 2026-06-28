import type { Metadata } from 'next';
import { TgInit } from './tg-init';
import { TgNav } from './tg-nav';

export const metadata: Metadata = { title: 'Academia J Rubio' };

export default function TgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <TgInit />
      <div className="pb-16">{children}</div>
      <TgNav />
    </div>
  );
}
