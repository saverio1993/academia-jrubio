import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@academia/db';
import { auth } from '@/auth';
import { dateShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, select: { id: true, title: true } });
  if (!course) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/academia/${slug}/certificado`);

  const cert = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
  });
  if (!cert) redirect(`/academia/${slug}`);

  const name = session.user.name ?? session.user.email ?? 'Alumno';

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/academia/${slug}`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-fg)]">
        ← Volver al curso
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="h-2 bg-gradient-to-r from-[var(--color-accent)] to-purple-500" />
        <div className="p-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Certificado de finalización
          </p>
          <p className="mt-8 text-sm text-[var(--color-muted)]">Otorgado a</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{name}</p>

          <p className="mt-8 text-sm text-[var(--color-muted)]">Por completar el curso</p>
          <p className="mt-1 text-xl font-semibold text-[var(--color-accent)]">{course.title}</p>

          <div className="mt-10 flex items-center justify-center gap-8 text-xs text-[var(--color-muted)]">
            <div>
              <p className="font-medium text-[var(--color-fg)]">{dateShort(cert.issuedAt)}</p>
              <p>Fecha de emisión</p>
            </div>
            <div className="h-8 w-px bg-[var(--color-border)]" />
            <div>
              <p className="font-mono font-medium text-[var(--color-fg)]">{cert.code}</p>
              <p>Código de verificación</p>
            </div>
          </div>

          <p className="mt-10 text-sm font-semibold">
            Academia <span className="text-[var(--color-accent)]">J Rubio</span>
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
        Para imprimir o guardar como PDF usa la opción de imprimir de tu navegador (Ctrl/Cmd + P).
      </p>
    </main>
  );
}
