import { prisma } from '@academia/db';
import { assertAdmin } from '@/lib/admin';
import { PageHeader, Table, Th, Td, Badge, Empty } from '../_components/ui';
import { CreateCouponForm } from './create-coupon-form';
import { DeactivateButton } from './deactivate-button';

export const dynamic = 'force-dynamic';

function formatValue(type: string, value: number) {
  return type === 'PERCENT' ? `${value}%` : `$${(value / 100).toFixed(2)}`;
}

export default async function CuponesPage() {
  await assertAdmin();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Cupones de descuento"
        subtitle="Crea códigos de descuento para aplicar en el pago de suscripciones"
      />

      <CreateCouponForm />

      {coupons.length === 0 ? (
        <Empty>Sin cupones creados todavía.</Empty>
      ) : (
        <Table head={
          <>
            <Th>Código</Th>
            <Th>Descuento</Th>
            <Th>Duración en Stripe</Th>
            <Th>Descripción</Th>
            <Th>Usos</Th>
            <Th>Vence</Th>
            <Th>Estado</Th>
            <Th></Th>
          </>
        }>
          {coupons.map(c => {
            const expired = c.expiresAt && c.expiresAt < now;
            const exhausted = c.maxUses !== null && c.uses >= c.maxUses;
            const active = c.active && !expired && !exhausted;

            return (
              <tr key={c.id} className={`hover:bg-white/[0.02] ${!active ? 'opacity-50' : ''}`}>
                <Td>
                  <span className="font-mono text-sm font-semibold tracking-wider">{c.code}</span>
                </Td>
                <Td>
                  <span className="text-sm font-medium text-[var(--color-accent)]">
                    {formatValue(c.type, c.value)}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-[var(--color-muted)]">—</span>
                </Td>
                <Td>
                  <span className="text-xs text-[var(--color-muted)]">{c.description ?? '—'}</span>
                </Td>
                <Td>
                  <span className="text-xs">
                    {c.uses}{c.maxUses ? `/${c.maxUses}` : ''}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs text-[var(--color-muted)] whitespace-nowrap">
                    {c.expiresAt
                      ? c.expiresAt.toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })
                      : '—'}
                  </span>
                </Td>
                <Td>
                  {active    && <Badge color="green">Activo</Badge>}
                  {!c.active && <Badge color="gray">Desactivado</Badge>}
                  {c.active && expired    && <Badge color="yellow">Expirado</Badge>}
                  {c.active && exhausted && !expired && <Badge color="gray">Agotado</Badge>}
                </Td>
                <Td>
                  {c.active && <DeactivateButton id={c.id} />}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
