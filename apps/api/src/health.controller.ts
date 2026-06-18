import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'academia-jrubio-api',
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
