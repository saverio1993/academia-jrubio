import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { CheckoutService } from './checkout.service';

const schema = z.object({
  planSlug: z.string().min(1),
  email: z.string().email().optional(),
  userId: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('session')
  async create(@Body() body: unknown) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.format());
    return this.checkout.createSession(parsed.data);
  }
}
