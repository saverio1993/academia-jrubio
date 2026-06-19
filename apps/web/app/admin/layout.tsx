import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { UserMenu } from '@/components/user-menu';
import { Sidebar } from './_components/sidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-academia.png"
              alt="Academia J Rubio"
              className="h-10 w-10 object-contain transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
                Biblioteca de Archivos
              </span>
              <span className="font-bold text-sm text-[var(--color-fg)] group-hover:text-[var(--color-accent)] transition-colors">
                Academia J Rubio
              </span>
            </div>
            <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link href="/" className="hidden sm:inline text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">
              Ver sitio
            </Link>
            <UserMenu
              name={admin.name}
              email={admin.email}
              image={admin.image}
              role={admin.role}
            />
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
