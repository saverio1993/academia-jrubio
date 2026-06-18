import Link from 'next/link';
import type { PaymentStatus } from '@academia/db';
import { prisma } from '@academia/db';
import { money, dateTime } from '@/lib/format';
import { PageHeader, Table, Th, Td, Badge, Empty, btnApprove, btnDanger } from '../_components/ui';
import { approvePayment, rejectPayment } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  SUCCEEDED: 'green',
  FAILED: 'red',
  REJECTED: 'red',
  REFUNDED: 'gray',
  PENDING: 'yellow',
  AWAITING_APPROVAL: 'yellow',
};

const FILTERS: { key: string; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'AWAITING_APPROVAL', label: 'Por aprobar' },
  { key: 'SUCCEEDED', label: 'Cobrados' },
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'REJECTED', label: 'Rechazados' },
];

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const active = estado && estado !== 'TODOS' ? estado : 'TODOS';
  const where = active !== 'TODOS' ? { status: active as PaymentStatus } : {};

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <>
      <PageHeader title="Pagos" subtitle={`${payments.length} pago(s)`} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'TODOS' ? '/admin/pagos' : `/admin/pagos?estado=${f.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active === f.key
                ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-white/5'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <Empty>No hay pagos con este filtro.</Empty>
      ) : (
        <Table
          head={
            <>
              <Th>Usuario</Th>
              <Th>Monto</Th>
              <Th>Método</Th>
              <Th>Comprobante</Th>
              <Th>Fecha</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </>
          }
        >
          {payments.map((p) => {
            const canModerate = p.status === 'AWAITING_APPROVAL' || p.status === 'PENDING';
            return (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <Td>
                  <p className="font-medium">{p.user.name ?? '—'}</p>
                  <p className="text-xs text-[var(--color-muted)]">{p.user.email}</p>
                </Td>
                <Td className="font-medium">{money(p.amountCents, p.currency)}</Td>
                <Td className="text-[var(--color-muted)]">{p.provider}</Td>
                <Td>
                  {p.proofUrl ? (
                    <a
                      href={p.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                  {dateTime(p.createdAt)}
                </Td>
                <Td>
                  <Badge color={STATUS_COLORS[p.status] ?? 'gray'}>{p.status}</Badge>
                </Td>
                <Td>
                  {canModerate ? (
                    <div className="flex items-center justify-end gap-2">
                      <form action={approvePayment}>
                        <input type="hidden" name="paymentId" value={p.id} />
                        <button className={btnApprove}>Aprobar</button>
                      </form>
                      <form action={rejectPayment}>
                        <input type="hidden" name="paymentId" value={p.id} />
                        <button className={btnDanger}>Rechazar</button>
                      </form>
                    </div>
                  ) : (
                    <span className="block text-right text-xs text-[var(--color-muted)]">—</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
