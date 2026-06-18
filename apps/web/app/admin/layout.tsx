import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { Sidebar } from './_components/sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-bold tracking-tight">
              Academia <span className="text-[var(--color-accent)]">J Rubio</span>
            </Link>
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">
              Ver sitio
            </Link>
            <Link href="/dashboard" className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">
              Mi cuenta
            </Link>
            <span className="hidden text-[var(--color-muted)] sm:inline">·</span>
            <span className="hidden max-w-[180px] truncate text-[var(--color-muted)] sm:inline">
              {admin.name ?? admin.email}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
