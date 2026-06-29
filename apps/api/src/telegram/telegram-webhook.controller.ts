import {
  Controller, Post, Body, HttpCode, Logger, Headers, UnauthorizedException,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';

interface TgUser { id: number; first_name: string; username?: string }
interface TgChat { id: number; type: string }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
}
interface TgInlineQuery {
  id: string;
  from: TgUser;
  query: string;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  inline_query?: TgInlineQuery;
}

@Controller('telegram')
export class TelegramWebhookController {
  private readonly log = new Logger('TelegramWebhook');

  constructor(private readonly tg: TelegramService) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Body() update: TgUpdate,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    // Verificar secret token si está configurado
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      throw new UnauthorizedException();
    }

    if (update.inline_query) {
      await this.handleInlineQuery(update.inline_query);
      return { ok: true };
    }
    if (update.message?.text) {
      await this.handleMessage(update.message);
    }
    return { ok: true };
  }

  // #6 — Inline query: @bot Samsung A55
  private async handleInlineQuery(query: TgInlineQuery) {
    const q = query.query.trim();
    if (!q) {
      await this.tg.answerInlineQuery(query.id, [{
        type: 'article',
        id: 'empty',
        title: '🔍 Escribe un modelo o marca...',
        description: 'Ejemplo: Samsung A55 FRP, Redmi Note 12 firmware',
        input_message_content: { message_text: 'Busca archivos en Academia J Rubio' },
        reply_markup: { inline_keyboard: [[{ text: '📁 Abrir biblioteca', url: `${this.tg.appUrl}/archivos` }]] },
      }]);
      return;
    }
    const files = await this.tg.searchFiles(q, 8);
    if (!files.length) {
      await this.tg.answerInlineQuery(query.id, [{
        type: 'article',
        id: 'no-results',
        title: `Sin resultados para "${q}"`,
        description: 'Prueba con otra búsqueda',
        input_message_content: { message_text: `Sin resultados para "${q}" en Academia J Rubio` },
      }]);
      return;
    }
    const results = this.tg.buildInlineResults(files);
    await this.tg.answerInlineQuery(query.id, results);
  }

  private async handleMessage(msg: TgMessage) {
    const text = (msg.text ?? '').trim();
    const chatId = msg.chat.id;

    if (text === '/start') {
      await this.tg.sendMessage(chatId,
        '👋 <b>Bienvenido a Academia J Rubio</b>\n\n' +
        'Comandos disponibles:\n' +
        '🔍 <b>/buscar</b> &lt;texto&gt; — Busca archivos en la biblioteca\n' +
        '💾 <b>/mifirmware</b> &lt;modelo&gt; — Busca firmwares específicos\n\n' +
        'También puedes usar <b>@este_bot texto</b> en cualquier chat para buscar inline.',
        { reply_markup: { inline_keyboard: [[{ text: '📁 Abrir biblioteca', url: `${this.tg.appUrl}/archivos` }]] } },
      );
      return;
    }

    // #1 — /buscar Samsung A55
    if (text.toLowerCase().startsWith('/buscar')) {
      const query = text.replace(/^\/buscar\s*/i, '').trim();
      if (!query) {
        await this.tg.sendMessage(chatId, 'Uso: <b>/buscar</b> &lt;modelo o marca&gt;\nEjemplo: <code>/buscar Samsung A55 FRP</code>');
        return;
      }
      const files = await this.tg.searchFiles(query, 5);
      await this.tg.sendMessage(
        chatId,
        this.tg.formatFileCard(files, query),
        { reply_markup: files.length ? this.tg.buildFileButton(query) : undefined },
      );
      return;
    }

    // #9 — /mifirmware Redmi Note 12
    if (text.toLowerCase().startsWith('/mifirmware')) {
      const query = text.replace(/^\/mifirmware\s*/i, '').trim();
      if (!query) {
        await this.tg.sendMessage(chatId, 'Uso: <b>/mifirmware</b> &lt;modelo&gt;\nEjemplo: <code>/mifirmware Redmi Note 12</code>');
        return;
      }
      const files = await this.tg.searchFiles(query, 5, 'firmware');
      const card = files.length
        ? this.tg.formatFileCard(files, query)
        : `💾 Sin firmwares para <b>${query}</b>. Prueba en la biblioteca completa.`;
      await this.tg.sendMessage(
        chatId,
        card,
        { reply_markup: this.tg.buildFileButton(query, '💾 Ver todos los firmwares') },
      );
      return;
    }

    this.log.debug(`Mensaje sin comando: "${text.slice(0, 50)}"`);
  }
}
