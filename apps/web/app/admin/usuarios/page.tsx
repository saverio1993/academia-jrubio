import { prisma } from '@academia/db';
import { dateShort } from '@/lib/format';
import { PageHeader, Table, Th, Td, Badge, Empty, inputCls, btnGhost } from '../_components/ui';
import { CreateUserModal } from './create-user-modal';
import { UserRow } from './user-row';

export const dynamic = 'force-dynamic';

function presenceLabel(lastSeenAt: Date | null): { dot: string; label: string; color: string } {
  if (!lastSeenAt) return { dot: 'bg-gray-600', label: 'Nunca', color: 'text-[var(--color-muted)]' };
  const diffMin = (Date.now() - lastSeenAt.getTime()) / 60_000;
  if (diffMin < 5)  return { dot: 'bg-green-500 animate-pulse', label: 'En línea', color: 'text-green-500' };
  if (diffMin < 30) return { dot: 'bg-yellow-500', label: `Hace ${Math.round(diffMin)} min`, color: 'text-yellow-500' };
  const diffH = diffMin / 60;
  if (diffH < 24)   return { dot: 'bg-gray-500', label: `Hace ${Math.round(diffH)}h`, color: 'text-[var(--color-muted)]' };
  const diffD = diffH / 24;
  return { dot: 'bg-gray-600', label: `Hace ${Math.round(diffD)}d`, color: 'text-[var(--color-muted)]' };
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; online?: string }>;
}) {
  const { q, online } = await searchParams;
  const onlineOnly = online === '1';
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);

  const where = {
    ...(q ? {
      OR: [
        { email: { contains: q, mode: 'insensitive' as const } },
        { name: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(onlineOnly ? { lastSeenAt: { gte: fiveMinAgo } } : {}),
  };

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, billingCycle: true },
  });

  const [users, onlineCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 100,
      include: {
        _count: { select: { subscriptions: true, payments: true, downloads: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { id: true, expiresAt: true, plan: { select: { name: true } } },
          take: 1,
          orderBy: { expiresAt: 'desc' },
        },
      },
    }),
    prisma.user.count({ where: { lastSeenAt: { gte: fiveMinAgo } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} usuario(s) · ${onlineCount} en línea ahora`}
        action={<CreateUserModal plans={plans} />}
      />

      <form className="mb-5 flex gap-2 flex-wrap" action="/admin/usuarios">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre, correo o usuario…"
          className={inputCls + ' max-w-sm'}
        />
        {onlineOnly && <input type="hidden" name="online" value="1" />}
        <button className={btnGhost}>Buscar</button>
        <a
          href={onlineOnly ? '/admin/usuarios' : '/admin/usuarios?online=1'}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            onlineOnly
              ? 'border-green-500/40 bg-green-500/10 text-green-500'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${onlineOnly ? 'bg-green-500' : 'bg-gray-500'}`} />
          {onlineOnly ? `En línea (${onlineCount})` : `Solo en línea (${onlineCount})`}
        </a>
      </form>

      {users.length === 0 ? (
        <Empty>{onlineOnly ? 'No hay usuarios en línea ahora.' : 'No se encontraron usuarios.'}</Empty>
      ) : (
        <Table
          head={
            <>
              <Th>Estado</Th>
              <Th>Usuario</Th>
              <Th>País</Th>
              <Th>Suscripción</Th>
              <Th>Vencimiento</Th>
              <Th className="text-center">Pagos</Th>
              <Th>Registro</Th>
              <Th>Rol</Th>
              <Th>Acciones</Th>
            </>
          }
        >
          {users.map((u) => {
            const presence = presenceLabel(u.lastSeenAt);
            return (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${presence.dot}`} />
                    <span className={`text-[11px] font-medium whitespace-nowrap ${presence.color}`}>
                      {presence.label}
                    </span>
                  </div>
                </Td>
                <UserRow
                  userId={u.id}
                  currentRole={u.role as 'USER' | 'MODERATOR' | 'ADMIN'}
                  currentName={u.name ?? u.username ?? null}
                  email={u.email}
                />
                <Td className="text-[var(--color-muted)]">{u.country ?? '—'}</Td>
                <Td>
                  {u.subscriptions.length > 0 ? (
                    <Badge color="green">{u.subscriptions[0]?.plan?.name ?? 'Activa'}</Badge>
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">Sin plan</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                  {u.subscriptions[0]?.expiresAt ? dateShort(u.subscriptions[0].expiresAt) : '—'}
                </Td>
                <Td className="text-center text-[var(--color-muted)]">{u._count.payments}</Td>
                <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                  {dateShort(u.createdAt)}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
