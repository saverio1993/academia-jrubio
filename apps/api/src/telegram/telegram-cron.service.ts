import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '@academia/db';
import { TelegramService } from './telegram.service';

@Injectable()
export class TelegramCronService {
  private readonly log = new Logger('TelegramCron');

  constructor(private readonly tg: TelegramService) {}

  // Todos los días a las 9:00 AM
  @Cron('0 9 * * *')
  async sendExpiryReminders() {
    if (!this.tg.token) return;

    const now = new Date();
    const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in4d = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const subs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: in3d, lt: in4d },
        user: { telegramId: { not: null } },
      },
      include: {
        user: { select: { telegramId: true, name: true } },
        plan: { select: { name: true } },
      },
    });

    this.log.log(`Enviando recordatorios a ${subs.length} suscriptores`);

    for (const sub of subs) {
      if (!sub.user.telegramId) continue;
      const firstName = sub.user.name?.split(' ')[0] ?? 'técnico';
      const expDate = sub.expiresAt!.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });

      const text = [
        `⏰ <b>Hola ${firstName}, tu suscripción vence pronto</b>`,
        '',
        `Tu plan <b>${sub.plan.name}</b> vence el <b>${expDate}</b> (en 3 días).`,
        '',
        'Renueva ahora para no perder acceso a la biblioteca de archivos, la academia y el foro.',
      ].join('\n');

      await this.tg.sendMessage(sub.user.telegramId, text, {
        reply_markup: {
          inline_keyboard: [[{
            text: '🔄 Renovar suscripción',
            url: `${this.tg.appUrl}/planes`,
          }]],
        },
      });
    }
  }
}
