import { prisma } from '@academia/db';
import { dateShort, daysLeft } from '@/lib/format';
import { PageHeader, Card, Table, Th, Td, Badge, Empty, inputCls } from '../_components/ui';
import { updateSubscription, grantSubscription } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'gray' | 'blue'> = {
  ACTIVE: 'green',
  PAST_DUE: 'yellow',
  SUSPENDED: 'yellow',
  CANCELED: 'gray',
  EXPIRED: 'red',
};

const STATUSES = ['ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXPIRED'];

function toDateInput(d: Date | null | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export default async function SuscripcionesPage() {
  const [subs, users, plans] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, name: true, email: true } }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceCents: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Suscripciones" subtitle={`${subs.length} suscripción(es)`} />

      {/* Otorgar membresía */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-semibold">Otorgar membresía manualmente</h2>
        <form action={grantSubscription} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Usuario</span>
            <select name="userId" className={inputCls} required defaultValue="">
              <option value="" disabled>
                Selecciona…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} — ${u.email}` : u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Plan</span>
            <select name="planId" className={inputCls} required defaultValue="">
              <option value="" disabled>
                Selecciona…
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Días (0 = sin vencimiento)</span>
            <input name="days" type="number" min="0" defaultValue="30" className={inputCls} />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
              Otorgar
            </button>
          </div>
        </form>
      </Card>

      {subs.length === 0 ? (
        <Empty>No hay suscripciones todavía.</Empty>
      ) : (
        <Table
          head={
            <>
              <Th>Usuario</Th>
              <Th>Plan</Th>
              <Th>Inicio</Th>
              <Th>Estado / Vencimiento</Th>
            </>
          }
        >
          {subs.map((s) => {
            const dl = daysLeft(s.expiresAt);
            return (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <Td>
                  <p className="font-medium">{s.user.name ?? '—'}</p>
                  <p className="text-xs text-[var(--color-muted)]">{s.user.email}</p>
                </Td>
                <Td>{s.plan.name}</Td>
                <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                  {dateShort(s.startedAt)}
                  {dl != null && (
                    <span className="ml-2">
                      {dl > 0 ? (
                        <Badge color={dl <= 5 ? 'yellow' : 'gray'}>{dl} días</Badge>
                      ) : (
                        <Badge color="red">Vencida</Badge>
                      )}
                    </span>
                  )}
                </Td>
                <Td>
                  <form action={updateSubscription} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <Badge color={STATUS_COLORS[s.status] ?? 'gray'}>{s.status}</Badge>
                    <select
                      name="status"
                      defaultValue={s.status}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <input
                      name="expiresAt"
                      type="date"
                      defaultValue={toDateInput(s.expiresAt)}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                    <button className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs transition-colors hover:bg-white/5">
                      Guardar
                    </button>
                  </form>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
