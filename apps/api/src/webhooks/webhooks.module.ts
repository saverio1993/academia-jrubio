import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeService } from '../stripe/stripe.service';

@Module({
  controllers: [StripeWebhookController],
  providers: [StripeService],
})
export class WebhooksModule {}
