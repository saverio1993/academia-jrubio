/**
 * Sincroniza los planes de la BD con productos y precios en Stripe.
 * Crea solo si no existe. Idempotente.
 */
import Stripe from 'stripe';
import { prisma, BillingCycle } from '../src/index';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

function recurringConfig(cycle: BillingCycle): Stripe.PriceCreateParams.Recurring | null {
  switch (cycle) {
    case 'MONTHLY': return { interval: 'month' };
    case 'QUARTERLY': return { interval: 'month', interval_count: 3 };
    case 'YEARLY': return { interval: 'year' };
    case 'LIFETIME': return null; // one-time
  }
}

async function syncPlan(slug: string) {
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (!plan) throw new Error(`Plan '${slug}' no existe`);

  // 1. Producto
  let productId = plan.stripeProductId;
  if (!productId) {
    const product = await stripe.products.create({
      name: `Academia J Rubio — ${plan.name}`,
      description: plan.description ?? undefined,
      metadata: { planSlug: plan.slug, planId: plan.id },
    });
    productId = product.id;
    console.log(`  ✓ Producto creado: ${product.id} (${plan.name})`);
  } else {
    console.log(`  · Producto ya existe: ${productId}`);
  }

  // 2. Precio
  let priceId = plan.stripePriceId;
  if (!priceId) {
    const recurring = recurringConfig(plan.billingCycle);
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: plan.priceCents,
      currency: plan.currency.toLowerCase(),
      ...(recurring ? { recurring } : {}),
      metadata: { planSlug: plan.slug },
    });
    priceId = price.id;
    console.log(`  ✓ Precio creado: ${price.id} ($${(plan.priceCents/100).toFixed(2)} ${plan.currency}/${plan.billingCycle})`);
  } else {
    console.log(`  · Precio ya existe: ${priceId}`);
  }

  await prisma.plan.update({
    where: { id: plan.id },
    data: { stripeProductId: productId, stripePriceId: priceId },
  });
}

async function main() {
  console.log('💳 Sincronizando planes con Stripe...\n');
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  for (const p of plans) {
    console.log(`[${p.slug}]`);
    await syncPlan(p.slug);
    console.log('');
  }
  console.log('✅ Sync completo.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
