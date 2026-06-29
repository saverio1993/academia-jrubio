import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramCronService } from './telegram-cron.service';
import { TelegramPollingService } from './telegram-polling.service';

@Module({
  controllers: [TelegramWebhookController],
  providers: [TelegramService, TelegramCronService, TelegramPollingService],
  exports: [TelegramService],
})
export class TelegramModule {}
