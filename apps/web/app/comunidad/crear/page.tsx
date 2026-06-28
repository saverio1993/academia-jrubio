import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { hasActiveSubscription } from '@/lib/access';
import { TopNav } from '@/components/top-nav';
import { CreatePostForm } from './create-post-form';

export const dynamic = 'force-dynamic';

export default async function CrearPostPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/comunidad/crear');

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
  const hasSub = isAdmin || (await hasActiveSubscription(userId));

  if (!hasSub) redirect('/planes');

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Nueva <span style={{ color: 'var(--color-accent)' }}>publicación</span>
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Comparte tu guía, método o pregunta con la comunidad
            </p>
          </div>
          <CreatePostForm />
        </div>
      </main>
    </>
  );
}
