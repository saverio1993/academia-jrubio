import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { UserMenu } from './user-menu';

export async function TopNav() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, role: true },
  });

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base">
          <span className="text-xl">📚</span>
          <span>Mavim</span>
          <span className="text-[var(--color-accent)]">Biblioteca de Archivos</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
            Dashboard
          </Link>
          <Link href="/archivos" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
            Archivos
          </Link>
          <Link href="/academia" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
            Academia
          </Link>
          <Link href="/planes" className="text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors">
            Planes
          </Link>
          {user.role === 'ADMIN' && (
            <Link href="/admin" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors font-medium">
              Admin
            </Link>
          )}
        </nav>
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          role={user.role}
        />
      </div>
    </header>
  );
}
