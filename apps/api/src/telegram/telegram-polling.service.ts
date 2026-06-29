import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramWebhookController } from './telegram-webhook.controller';

interface TgUpdate {
  update_id: number;
  message?: { message_id: number; from?: { id: number }; chat: { id: number; type: string }; text?: string };
  inline_query?: { id: string; from: { id: number }; query: string };
}

@Injectable()
export class TelegramPollingService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('TelegramPolling');
  private running = false;
  private offset = 0;

  constructor(
    private readonly tg: TelegramService,
    private readonly webhook: TelegramWebhookController,
  ) {}

  onApplicationBootstrap() {
    const usePolling = process.env.TELEGRAM_POLLING === 'true';
    if (!this.tg.token || !usePolling) return;
    this.log.log('🤖 Modo polling activo (TELEGRAM_POLLING=true)');
    this.running = true;
    void this.poll();
  }

  onApplicationShutdown() {
    this.running = false;
  }

  private async poll() {
    while (this.running) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.tg.token}/getUpdates?offset=${this.offset}&timeout=25&allowed_updates=["message","inline_query"]`,
        );
        const data = await res.json() as { ok: boolean; result: TgUpdate[] };
        if (data.ok && data.result.length) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.webhook.handle(update as any, undefined);
          }
        }
      } catch (err) {
        this.log.warn(`Error en polling: ${(err as Error).message}`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
}
