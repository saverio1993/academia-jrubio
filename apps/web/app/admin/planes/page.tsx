import { prisma } from '@academia/db';
import { money } from '@/lib/format';
import { PageHeader, Card, Badge, inputCls } from '../_components/ui';
import { updatePlan, createPlan } from './actions';

export const dynamic = 'force-dynamic';

const CYCLES = [
  { v: 'MONTHLY', l: 'Mensual' },
  { v: 'QUARTERLY', l: 'Trimestral' },
  { v: 'YEARLY', l: 'Anual' },
  { v: 'LIFETIME', l: 'Vitalicia' },
];

export default async function PlanesPage() {
  const plans = await prisma.plan.findMany({
    orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <>
      <PageHeader title="Planes" subtitle={`${plans.length} plan(es)`} />

      <div className="space-y-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-5">
            <form action={updatePlan} className="space-y-4">
              <input type="hidden" name="id" value={p.id} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[var(--color-muted)]">/{p.slug}</span>
                  {p.isActive ? <Badge color="green">Activo</Badge> : <Badge color="gray">Inactivo</Badge>}
                  {!p.stripePriceId && <Badge color="yellow">Sin Stripe</Badge>}
                </div>
                <span className="text-xs text-[var(--color-muted)]">
                  {p._count.subscriptions} suscripción(es) · {money(p.priceCents, p.currency)}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-muted)]">Nombre</span>
                  <input name="name" defaultValue={p.name} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-muted)]">Precio (USD)</span>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={(p.priceCents / 100).toFixed(2)}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-muted)]">Ciclo</span>
                  <select name="billingCycle" defaultValue={p.billingCycle} className={inputCls}>
                    {CYCLES.map((c) => (
                      <option key={c.v} value={c.v}>
                        {c.l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-muted)]">Orden</span>
                  <input name="sortOrder" type="number" defaultValue={p.sortOrder} className={inputCls} />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-muted)]">Descripción</span>
                <input name="description" defaultValue={p.description ?? ''} className={inputCls} />
              </label>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={p.isActive} className="accent-[var(--color-accent)]" />
                  Plan activo (visible para los usuarios)
                </label>
                <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]">
                  Guardar cambios
                </button>
              </div>
            </form>
          </Card>
        ))}
      </div>

      {/* Crear plan */}
      <Card className="mt-6 p-5">
        <h2 className="mb-4 font-semibold">Crear nuevo plan</h2>
        <form action={createPlan} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Slug</span>
            <input name="slug" placeholder="trimestral" className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Nombre</span>
            <input name="name" placeholder="Plan Trimestral" className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Precio (USD)</span>
            <input name="price" type="number" step="0.01" min="0" placeholder="29.99" className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Ciclo</span>
            <select name="billingCycle" defaultValue="MONTHLY" className={inputCls}>
              {CYCLES.map((c) => (
                <option key={c.v} value={c.v}>
                  {c.l}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5">
              Crear plan
            </button>
            <span className="ml-3 text-xs text-[var(--color-muted)]">
              Nota: para cobrarlo con tarjeta necesitas sincronizarlo con Stripe (script sync-stripe).
            </span>
          </div>
        </form>
      </Card>
    </>
  );
}
