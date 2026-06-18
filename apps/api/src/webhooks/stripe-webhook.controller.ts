import {
  Controller, Post, Req, Headers, HttpCode, BadRequestException, Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { prisma } from '@academia/db';
import { StripeService } from '../stripe/stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly log = new Logger('StripeWebhook');
  constructor(private readonly stripe: StripeService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    if (secret && signature) {
      try {
        event = this.stripe.client.webhooks.constructEvent(req.rawBody!, signature, secret);
      } catch (err) {
        throw new BadRequestException(`Webhook signature inválida: ${(err as Error).message}`);
      }
    } else {
      // Modo dev sin secret: parsear directo (NO usar en producción)
      this.log.warn('STRIPE_WEBHOOK_SECRET no configurado — confiando en el payload directo (solo dev)');
      event = req.body as Stripe.Event;
    }

    this.log.log(`📨 Evento: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.onSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      default:
        this.log.debug(`(ignorado) ${event.type}`);
    }

    return { received: true };
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const planSlug = session.metadata?.planSlug;
    const userId = session.metadata?.userId || session.client_reference_id || null;
    const email = session.customer_email ?? session.customer_details?.email;

    if (!planSlug) {
      this.log.warn(`Sesión ${session.id} sin planSlug en metadata`);
      return;
    }
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) { this.log.warn(`Plan ${planSlug} no existe`); return; }

    // Resolver usuario: por userId, o por email, o crear placeholder
    let user = null;
    if (userId) user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user && email) user = await prisma.user.findUnique({ where: { email } });
    if (!user && email) {
      user = await prisma.user.create({
        data: { email, emailVerified: new Date(), name: session.customer_details?.name ?? null },
      });
      this.log.log(`Usuario creado desde checkout: ${user.email}`);
    }
    if (!user) { this.log.warn(`No se pudo resolver usuario para sesión ${session.id}`); return; }

    // Calcular expiración
    const now = new Date();
    let expiresAt: Date | null = null;
    if (plan.billingCycle === 'MONTHLY') expiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    else if (plan.billingCycle === 'QUARTERLY') expiresAt = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
    else if (plan.billingCycle === 'YEARLY') expiresAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000);

    const stripeSubId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    await prisma.$transaction([
      prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt,
          stripeSubscriptionId: stripeSubId ?? null,
          stripeCustomerId: stripeCustomerId ?? null,
        },
      }),
      prisma.payment.create({
        data: {
          userId: user.id,
          amountCents: session.amount_total ?? plan.priceCents,
          currency: (session.currency ?? plan.currency).toUpperCase(),
          provider: 'STRIPE',
          status: 'SUCCEEDED',
          providerRef: session.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'subscription.created',
          target: `plan:${plan.slug}`,
          metadata: { sessionId: session.id, planSlug: plan.slug },
        },
      }),
    ]);

    this.log.log(`✅ Suscripción creada: ${user.email} → ${plan.slug}`);
  }

  private async onSubscriptionChange(sub: Stripe.Subscription) {
    const dbSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
    if (!dbSub) return;

    const status =
      sub.status === 'active' || sub.status === 'trialing' ? 'ACTIVE'
      : sub.status === 'past_due' ? 'PAST_DUE'
      : sub.status === 'canceled' ? 'CANCELED'
      : sub.status === 'unpaid' ? 'SUSPENDED'
      : 'EXPIRED';

    await prisma.subscription.update({
      where: { id: dbSub.id },
      data: { status, canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null },
    });
    this.log.log(`🔄 Subscription ${sub.id} → ${status}`);
  }
}
