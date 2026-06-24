import { prisma } from '@academia/db';
import { dateShort } from '@/lib/format';
import { PageHeader, Table, Th, Td, Badge, Empty, inputCls, btnGhost } from '../_components/ui';
import { changeRole } from './actions';
import { CreateUserModal } from './create-user-modal';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
          { username: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, billingCycle: true },
  });

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
  });

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} usuario(s)`}
        action={<CreateUserModal plans={plans} />}
      />

      <form className="mb-5 flex gap-2" action="/admin/usuarios">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre, correo o usuario…"
          className={inputCls + ' max-w-sm'}
        />
        <button className={btnGhost}>Buscar</button>
      </form>

      {users.length === 0 ? (
        <Empty>No se encontraron usuarios.</Empty>
      ) : (
        <Table
          head={
            <>
              <Th>Usuario</Th>
              <Th>País</Th>
              <Th>Suscripción</Th>
              <Th>Vencimiento</Th>
              <Th className="text-center">Pagos</Th>
              <Th>Registro</Th>
              <Th>Rol</Th>
            </>
          }
        >
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-white/[0.02]">
              <Td>
                <div className="min-w-0">
                  <p className="font-medium">{u.name ?? u.username ?? '—'}</p>
                  <p className="text-xs text-[var(--color-muted)]">{u.email}</p>
                </div>
              </Td>
              <Td className="text-[var(--color-muted)]">{u.country ?? '—'}</Td>
              <Td>
                {u.subscriptions.length > 0 ? (
                  <Badge color="green">{u.subscriptions[0]?.plan?.name ?? 'Activa'}</Badge>
                ) : (
                  <span className="text-xs text-[var(--color-muted)]">Sin plan</span>
                )}
              </Td>
              <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                {u.subscriptions[0]?.expiresAt
                  ? dateShort(u.subscriptions[0].expiresAt)
                  : '—'}
              </Td>
              <Td className="text-center text-[var(--color-muted)]">{u._count.payments}</Td>
              <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                {dateShort(u.createdAt)}
              </Td>
              <Td>
                <form action={changeRole} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select
                    name="role"
                    defaultValue={u.role}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs transition-colors hover:bg-white/5">
                    Guardar
                  </button>
                </form>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
