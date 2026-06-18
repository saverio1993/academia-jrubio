import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@academia/db';
import { StripeService } from '../stripe/stripe.service';

interface CreateSessionInput {
  planSlug: string;
  userId?: string;
  email?: string;
  successUrl?: string;
  cancelUrl?: string;
}

@Injectable()
export class CheckoutService {
  constructor(private readonly stripe: StripeService) {}

  async createSession(input: CreateSessionInput) {
    const plan = await prisma.plan.findUnique({ where: { slug: input.planSlug } });
    if (!plan) throw new NotFoundException(`Plan '${input.planSlug}' no encontrado`);
    if (!plan.stripePriceId) {
      throw new BadRequestException(`Plan '${plan.slug}' no está sincronizado con Stripe`);
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const mode = plan.billingCycle === 'LIFETIME' ? 'payment' : 'subscription';

    const session = await this.stripe.client.checkout.sessions.create({
      mode,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: input.successUrl ?? `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl ?? `${appUrl}/planes`,
      customer_email: input.email,
      client_reference_id: input.userId,
      metadata: {
        planSlug: plan.slug,
        planId: plan.id,
        userId: input.userId ?? '',
      },
      ...(mode === 'subscription'
        ? { subscription_data: { metadata: { planSlug: plan.slug, planId: plan.id } } }
        : {}),
    });

    return { url: session.url, sessionId: session.id };
  }
}
