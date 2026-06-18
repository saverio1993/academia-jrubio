import { prisma, BillingCycle } from '../src/index';

async function main() {
  console.log('🌱 Sembrando planes iniciales...');

  const plans = [
    {
      slug: 'mensual',
      name: 'Mensual',
      description: 'Acceso a la biblioteca completa y comunidad',
      priceCents: 999,
      billingCycle: BillingCycle.MONTHLY,
      features: ['Biblioteca completa', 'Comunidad Telegram', 'Soporte por email'],
      sortOrder: 1,
    },
    {
      slug: 'anual',
      name: 'Anual',
      description: '2 meses gratis vs mensual',
      priceCents: 9990,
      billingCycle: BillingCycle.YEARLY,
      features: ['Todo lo del plan mensual', 'Descuento del 17%', 'Soporte prioritario'],
      sortOrder: 2,
    },
    {
      slug: 'premium',
      name: 'Premium',
      description: 'Acceso anticipado a herramientas y bot IA',
      priceCents: 14990,
      billingCycle: BillingCycle.YEARLY,
      features: ['Todo lo del plan anual', 'Bot de IA (100 consultas/día)', 'Tutoriales premium'],
      sortOrder: 3,
    },
    {
      slug: 'vip',
      name: 'VIP',
      description: 'Acceso completo + IA ilimitada + cursos',
      priceCents: 24990,
      billingCycle: BillingCycle.YEARLY,
      features: ['Todo lo del plan premium', 'IA ilimitada', 'Cursos incluidos', 'Llamadas 1:1'],
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log('✅ Listo. Planes:', plans.map((p) => p.slug).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
