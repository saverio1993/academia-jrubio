import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@academia/db';

/**
 * Garantiza que quien accede es ADMIN. Revalida el rol contra la base de datos
 * (no confía solo en la sesión, que podría estar desactualizada).
 * Devuelve el usuario admin o redirige.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true, email: true, image: true },
  });

  if (!user || user.role !== 'ADMIN') redirect('/dashboard');
  return user;
}

/** Igual que requireAdmin pero para usar dentro de server actions (lanza en vez de redirigir). */
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('No autenticado');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') throw new Error('No autorizado');
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
