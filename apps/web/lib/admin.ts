import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';

type AdminUser = { id: string; role: string; name: string | null; email: string; image: string | null };

/** ADMIN o MODERADOR — para el panel de administración y gestión de contenido. */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true, email: true, image: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) redirect('/dashboard');
  return user;
}

/** Solo ADMIN — para operaciones sensibles (usuarios, pagos, planes). */
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') throw new Error('No autorizado — solo administradores');
  return user;
}

/** ADMIN o MODERADOR — para server actions de contenido (archivos, cursos, IA). */
export async function assertAdminOrModerator() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) throw new Error('No autorizado');
  return user;
}

/** Registra una acción administrativa en el AuditLog. */
export async function logAudit(
  actorId: string,
  action: string,
  target?: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, target, metadata: metadata as object },
    });
  } catch {
    // el log de auditoría nunca debe romper la acción principal
  }
}
