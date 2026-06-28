import { auth } from '@/auth';
import { prisma } from '@academia/db';
import { redirect, notFound } from 'next/navigation';
import { TopNav } from '@/components/top-nav';
import { EditPostForm } from './edit-post-form';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export default async function EditarPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/comunidad/${slug}/editar`);

  const userId = session.user.id;
  const role = session.user.role as string;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, title: true, content: true, category: true, authorId: true, status: true },
  });

  if (!post || post.status === 'DRAFT') notFound();
  if (!isAdmin && post.authorId !== userId) redirect(`/comunidad/${slug}`);

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)] pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Editar <span style={{ color: 'var(--color-accent)' }}>publicación</span>
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Los cambios se guardan inmediatamente
            </p>
          </div>
          <EditPostForm slug={slug} post={post} />
        </div>
      </main>
    </>
  );
}
