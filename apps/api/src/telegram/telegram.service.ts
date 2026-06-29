import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@academia/db';

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

@Injectable()
export class TelegramService {
  private readonly log = new Logger('Telegram');
  readonly token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  readonly appUrl = (process.env.APP_URL ?? 'https://academia-jrubio.vercel.app').replace(/\/$/, '');

  private async call(method: string, body: object): Promise<unknown> {
    if (!this.token) {
      this.log.warn('TELEGRAM_BOT_TOKEN no configurado');
      return null;
    }
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async sendMessage(chatId: number | string, text: string, extra: object = {}) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra,
    });
  }

  async answerInlineQuery(queryId: string, results: object[], cacheTime = 10) {
    return this.call('answerInlineQuery', {
      inline_query_id: queryId,
      results,
      cache_time: cacheTime,
    });
  }

  async searchFiles(query: string, limit = 8, category?: string) {
    const where = {
      ...(query.trim() ? {
        OR: [
          { title:    { contains: query, mode: 'insensitive' as const } },
          { brand:    { contains: query, mode: 'insensitive' as const } },
          { model:    { contains: query, mode: 'insensitive' as const } },
          { tags:     { has: query.toLowerCase() } },
        ],
      } : {}),
      ...(category ? { category } : {}),
    };
    return prisma.fileItem.findMany({
      where,
      orderBy: { downloadsCount: 'desc' },
      take: limit,
      select: { id: true, title: true, brand: true, model: true, category: true, isPremium: true, fileSize: true },
    });
  }

  formatFileCard(files: Awaited<ReturnType<TelegramService['searchFiles']>>, query: string): string {
    if (!files.length) return `Sin resultados para <b>${query}</b> en la biblioteca.`;
    const lines = files.map((f) => {
      const icon = CAT_ICON[f.category] ?? '📄';
      const model = f.model ? ` · ${f.model}` : '';
      const lock = f.isPremium ? ' 🔒' : '';
      return `${icon} <b>${f.title}</b>${lock}\n   ${f.brand ?? ''}${model} · <i>${f.category}</i>`;
    });
    return `🔍 <b>${files.length} resultado${files.length !== 1 ? 's' : ''}</b> para "<b>${query}</b>":\n\n${lines.join('\n\n')}`;
  }

  buildFileButton(query: string, label = '📁 Ver en Academia') {
    return {
      inline_keyboard: [[{
        text: label,
        url: `${this.appUrl}/archivos`,
      }]],
    };
  }

  buildInlineResults(files: Awaited<ReturnType<TelegramService['searchFiles']>>) {
    return files.map((f) => {
      const icon = CAT_ICON[f.category] ?? '📄';
      const model = f.model ? ` · ${f.model}` : '';
      const lock = f.isPremium ? ' 🔒' : '';
      return {
        type: 'article',
        id: f.id,
        title: `${icon} ${f.title}${lock}`,
        description: `${f.brand ?? ''}${model} · ${f.category}`,
        input_message_content: {
          message_text: `${icon} <b>${f.title}</b>${lock}\n${f.brand ?? ''}${model} · <i>${f.category}</i>\n\n<a href="${this.appUrl}/archivos">Ver en Academia J Rubio →</a>`,
          parse_mode: 'HTML',
        },
        reply_markup: {
          inline_keyboard: [[{
            text: '📁 Ver todos los archivos',
            url: `${this.appUrl}/archivos`,
          }]],
        },
      };
    });
  }
}
