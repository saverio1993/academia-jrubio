import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN ?? '';
const APP_URL = (process.env.APP_URL ?? 'https://academia-jrubio.vercel.app').replace(/\/$/, '');

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

async function tg(method: string, body: object) {
  if (!TOKEN) return null;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(chatId: number | string, text: string, extra: object = {}) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

async function searchFiles(query: string, limit = 5, category?: string) {
  return prisma.fileItem.findMany({
    where: {
      ...(query.trim() ? {
        OR: [
          { title:    { contains: query, mode: 'insensitive' } },
          { brand:    { contains: query, mode: 'insensitive' } },
          { model:    { contains: query, mode: 'insensitive' } },
        ],
      } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { downloadsCount: 'desc' },
    take: limit,
    select: { id: true, title: true, brand: true, model: true, category: true, isPremium: true },
  });
}

function formatCard(files: Awaited<ReturnType<typeof searchFiles>>, query: string) {
  if (!files.length) return `Sin resultados para <b>${query}</b> en la biblioteca.`;
  const lines = files.map(f => {
    const icon  = CAT_ICON[f.category] ?? '📄';
    const model = f.model ? ` · ${f.model}` : '';
    const lock  = f.isPremium ? ' 🔒' : '';
    return `${icon} <b>${f.title}</b>${lock}\n   ${f.brand ?? ''}${model} · <i>${f.category}</i>`;
  });
  return `🔍 <b>${files.length} resultado${files.length !== 1 ? 's' : ''}</b> para "<b>${query}</b>":\n\n${lines.join('\n\n')}`;
}

function viewButton(label = '📁 Ver en Academia') {
  return { inline_keyboard: [[{ text: label, url: `${APP_URL}/archivos` }]] };
}

// ── Inline query (#6) ───────────────────────────────────────────────────────
async function handleInlineQuery(query: { id: string; query: string }) {
  const q = query.query.trim();
  if (!q) {
    return tg('answerInlineQuery', {
      inline_query_id: query.id,
      cache_time: 5,
      results: [{
        type: 'article', id: 'empty',
        title: '🔍 Escribe un modelo o marca...',
        description: 'Ejemplo: Samsung A55 FRP, Redmi Note 12 firmware',
        input_message_content: { message_text: 'Busca archivos en Academia J Rubio' },
        reply_markup: { inline_keyboard: [[{ text: '📁 Abrir biblioteca', url: `${APP_URL}/archivos` }]] },
      }],
    });
  }
  const files = await searchFiles(q, 8);
  if (!files.length) {
    return tg('answerInlineQuery', {
      inline_query_id: query.id,
      cache_time: 5,
      results: [{
        type: 'article', id: 'no-results',
        title: `Sin resultados para "${q}"`,
        description: 'Prueba con otra búsqueda',
        input_message_content: { message_text: `Sin resultados para "${q}" en Academia J Rubio` },
      }],
    });
  }
  const results = files.map(f => ({
    type: 'article',
    id: f.id,
    title: `${CAT_ICON[f.category] ?? '📄'} ${f.title}${f.isPremium ? ' 🔒' : ''}`,
    description: `${f.brand ?? ''}${f.model ? ` · ${f.model}` : ''} · ${f.category}`,
    input_message_content: {
      message_text: `${CAT_ICON[f.category] ?? '📄'} <b>${f.title}</b>${f.isPremium ? ' 🔒' : ''}\n${f.brand ?? ''}${f.model ? ` · ${f.model}` : ''} · <i>${f.category}</i>\n\n<a href="${APP_URL}/archivos">Ver en Academia J Rubio →</a>`,
      parse_mode: 'HTML',
    },
    reply_markup: {
      inline_keyboard: [[{ text: '📁 Ver todos los archivos', url: `${APP_URL}/archivos` }]],
    },
  }));
  return tg('answerInlineQuery', { inline_query_id: query.id, results, cache_time: 10 });
}

// ── Message commands ─────────────────────────────────────────────────────────
async function handleMessage(msg: { chat: { id: number }; text?: string }) {
  const text   = (msg.text ?? '').trim();
  const chatId = msg.chat.id;

  if (text === '/start') {
    return sendMessage(chatId,
      '👋 <b>Bienvenido a Academia J Rubio</b>\n\n' +
      'Comandos:\n' +
      '🔍 <b>/buscar</b> &lt;texto&gt; — busca archivos\n' +
      '💾 <b>/mifirmware</b> &lt;modelo&gt; — busca firmwares\n\n' +
      'También escribe <b>@este_bot texto</b> en cualquier chat para buscar inline.',
      { reply_markup: viewButton('📁 Abrir biblioteca') },
    );
  }

  // #1 /buscar
  if (text.toLowerCase().startsWith('/buscar')) {
    const query = text.replace(/^\/buscar\s*/i, '').trim();
    if (!query) {
      return sendMessage(chatId, 'Uso: <b>/buscar</b> &lt;modelo o marca&gt;\nEj: <code>/buscar Samsung A55 FRP</code>');
    }
    const files = await searchFiles(query, 5);
    return sendMessage(chatId, formatCard(files, query), {
      reply_markup: files.length ? viewButton() : undefined,
    });
  }

  // #9 /mifirmware
  if (text.toLowerCase().startsWith('/mifirmware')) {
    const query = text.replace(/^\/mifirmware\s*/i, '').trim();
    if (!query) {
      return sendMessage(chatId, 'Uso: <b>/mifirmware</b> &lt;modelo&gt;\nEj: <code>/mifirmware Redmi Note 12</code>');
    }
    const files = await searchFiles(query, 5, 'firmware');
    const card  = files.length ? formatCard(files, query) : `💾 Sin firmwares para <b>${query}</b>. Prueba en la biblioteca completa.`;
    return sendMessage(chatId, card, { reply_markup: viewButton('💾 Ver biblioteca completa') });
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!TOKEN) return NextResponse.json({ ok: false, error: 'no token' });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json();

  if (update.inline_query) await handleInlineQuery(update.inline_query);
  else if (update.message)  await handleMessage(update.message);

  return NextResponse.json({ ok: true });
}
