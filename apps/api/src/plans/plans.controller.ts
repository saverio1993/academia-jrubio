import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  async list() {
    return { data: await this.plans.findAll() };
  }

  @Get(':slug')
  async one(@Param('slug') slug: string) {
    const plan = await this.plans.findBySlug(slug);
    if (!plan) throw new NotFoundException(`Plan '${slug}' no encontrado`);
    return { data: plan };
  }
}
