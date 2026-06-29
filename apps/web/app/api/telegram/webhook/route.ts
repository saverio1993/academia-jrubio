import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';
import { callAI } from '@/lib/ai';

// Aumentar timeout de Vercel a 60s (IA puede tardar hasta 30s)
export const maxDuration = 60;

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

function getToken()  { return process.env.TELEGRAM_BOT_TOKEN ?? ''; }
function getAppUrl() { return (process.env.APP_URL ?? 'https://academia-jrubio-web-nnl3.vercel.app').replace(/\/$/, ''); }

async function tg(method: string, body: object) {
  const TOKEN = getToken();
  if (!TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (e) {
    console.error(`[tg ${method}]`, e);
    return null;
  }
}

async function sendMessage(chatId: number | string, text: string, extra: object = {}) {
  const safe = text.length > 4000 ? text.slice(0, 3997) + '...' : text;
  return tg('sendMessage', { chat_id: chatId, text: safe, parse_mode: 'HTML', ...extra });
}

async function sendTyping(chatId: number | string) {
  return tg('sendChatAction', { chat_id: chatId, action: 'typing' });
}

async function buildCatalogContext(categoryFilter?: string) {
  const catalog = await prisma.fileItem.findMany({
    where: categoryFilter ? { category: categoryFilter } : undefined,
    select: { title: true, brand: true, model: true, category: true, subcategory: true },
    take: 300,
    orderBy: { downloadsCount: 'desc' },
  });

  const grouped: Record<string, Record<string, string[]>> = {};
  for (const f of catalog) {
    const brand = f.brand || 'Otros';
    const cat   = f.category || 'sin categoría';
    if (!grouped[brand])      grouped[brand] = {};
    if (!grouped[brand][cat]) grouped[brand][cat] = [];
    const display = `${f.title}${f.model ? ` (${f.model})` : ''}`;
    if (!grouped[brand][cat].includes(display)) grouped[brand][cat].push(display);
  }

  const lines: string[] = [];
  for (const [brand, cats] of Object.entries(grouped).sort()) {
    lines.push(`\n## ${brand}`);
    for (const [cat, items] of Object.entries(cats).sort()) {
      lines.push(`  - ${cat}: ${items.slice(0, 15).join(', ')}`);
    }
  }
  return lines.join('\n');
}

async function searchFiles(query: string, limit = 5, category?: string) {
  const STOPWORDS = new Set(['el','la','los','las','un','una','del','de','en','con','para','por','que','es','se','al']);
  const keywords = query
    .split(/\s+/)
    .map(k => k.replace(/[¿?¡!.,;:]/g, '').toLowerCase())
    .filter(k => k.length > 1 && !STOPWORDS.has(k));

  const OR = [
    { title: { contains: query, mode: 'insensitive' as const } },
    { brand: { contains: query, mode: 'insensitive' as const } },
    { model: { contains: query, mode: 'insensitive' as const } },
    ...keywords.map(k => ({ title: { contains: k, mode: 'insensitive' as const } })),
    ...keywords.map(k => ({ brand: { contains: k, mode: 'insensitive' as const } })),
    ...keywords.map(k => ({ model: { contains: k, mode: 'insensitive' as const } })),
  ];

  return prisma.fileItem.findMany({
    where: { OR, ...(category ? { category } : {}) },
    orderBy: { downloadsCount: 'desc' },
    take: limit,
    select: { id: true, title: true, brand: true, model: true, category: true, isPremium: true },
  });
}

function formatFiles(files: Awaited<ReturnType<typeof searchFiles>>) {
  if (!files.length) return '';
  return '\n\n📁 <b>Archivos relacionados:</b>\n' + files.map(f => {
    const icon  = CAT_ICON[f.category] ?? '📄';
    const model = f.model ? ` · ${f.model}` : '';
    const lock  = f.isPremium ? ' 🔒' : '';
    return `${icon} ${f.title}${lock} — ${f.brand ?? ''}${model}`;
  }).join('\n');
}

// ── Inline query ──────────────────────────────────────────────────────────────
async function handleInlineQuery(query: { id: string; query: string }) {
  const q = query.query.trim();
  if (!q) {
    return tg('answerInlineQuery', {
      inline_query_id: query.id, cache_time: 5,
      results: [{
        type: 'article', id: 'empty',
        title: '🔍 Escribe un modelo o marca...',
        description: 'Ejemplo: Samsung A55 FRP, Redmi Note 12 firmware',
        input_message_content: { message_text: 'Busca archivos en Academia J Rubio' },
        reply_markup: { inline_keyboard: [[{ text: '📁 Abrir biblioteca', url: `${getAppUrl()}/tg/archivos` }]] },
      }],
    });
  }

  const files = await searchFiles(q, 8);
  if (!files.length) {
    return tg('answerInlineQuery', {
      inline_query_id: query.id, cache_time: 5,
      results: [{
        type: 'article', id: 'no-results',
        title: `Sin resultados para "${q}"`,
        description: 'Prueba con otra búsqueda o abre la biblioteca',
        input_message_content: { message_text: `Sin resultados para "${q}" en la biblioteca. Ver en: ${getAppUrl()}/archivos` },
        reply_markup: { inline_keyboard: [[{ text: '📁 Ver biblioteca completa', url: `${getAppUrl()}/tg/archivos` }]] },
      }],
    });
  }

  const results = files.map(f => ({
    type: 'article', id: f.id,
    title: `${CAT_ICON[f.category] ?? '📄'} ${f.title}${f.isPremium ? ' 🔒' : ''}`,
    description: `${f.brand ?? ''}${f.model ? ` · ${f.model}` : ''} · ${f.category}`,
    input_message_content: {
      message_text: `${CAT_ICON[f.category] ?? '📄'} <b>${f.title}</b>${f.isPremium ? ' 🔒' : ''}\n${f.brand ?? ''}${f.model ? ` · ${f.model}` : ''} · <i>${f.category}</i>`,
      parse_mode: 'HTML',
    },
    reply_markup: { inline_keyboard: [[{ text: '📁 Ver en Academia', url: `${getAppUrl()}/tg/archivos` }]] },
  }));

  return tg('answerInlineQuery', { inline_query_id: query.id, results, cache_time: 10 });
}

// ── Búsqueda con IA + fallback a BD ──────────────────────────────────────────
async function handleAIQuery(chatId: number, query: string, categoryFilter?: string) {
  await sendTyping(chatId);

  try {
    const [context, files] = await Promise.all([
      buildCatalogContext(categoryFilter),
      searchFiles(query, 5, categoryFilter),
    ]);

    const reply = await callAI({ query, context, userId: `tg_${chatId}` });
    const text  = `🤖 ${reply}${formatFiles(files)}`;

    const searchUrl = `${getAppUrl()}/tg/archivos?q=${encodeURIComponent(query)}${categoryFilter ? `&cat=${categoryFilter}` : ''}`;
    await sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: [[{ text: '📁 Ver resultados', url: searchUrl }]] },
    });
  } catch (err) {
    console.error('[telegram/handleAIQuery]', err);
    try {
      const files = await searchFiles(query, 6, categoryFilter);
      const searchUrl = `${getAppUrl()}/tg/archivos?q=${encodeURIComponent(query)}${categoryFilter ? `&cat=${categoryFilter}` : ''}`;
      if (files.length) {
        await sendMessage(chatId,
          `🔍 <b>Resultados para "${query}":</b>${formatFiles(files)}`,
          { reply_markup: { inline_keyboard: [[{ text: '📁 Ver todos', url: searchUrl }]] } },
        );
      } else {
        await sendMessage(chatId,
          `🔍 Sin resultados para <b>${query}</b>. Prueba con otra búsqueda.`,
          { reply_markup: { inline_keyboard: [[{ text: '📁 Ver biblioteca', url: `${getAppUrl()}/tg/archivos` }]] } },
        );
      }
    } catch (e2) {
      console.error('[telegram/fallback]', e2);
    }
  }
}

// ── Mensajes y comandos ───────────────────────────────────────────────────────
async function handleMessage(msg: {
  chat: { id: number; type: string };
  from?: { id: number; first_name: string };
  text?: string;
}) {
  const raw     = (msg.text ?? '').trim();
  const text    = raw.replace(/@\w+/g, '').trim();
  const chatId  = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';

  if (isGroup && !text.startsWith('/')) return;

  if (text === '/start') {
    const name = msg.from?.first_name ?? 'técnico';
    await sendMessage(chatId,
      `👋 <b>Hola ${name}!</b> Soy el asistente de Academia J Rubio.\n\n` +
      'Puedes preguntarme lo que necesitas directamente, o usar los comandos:\n\n' +
      '🔍 <b>/buscar</b> &lt;texto&gt; — busca cualquier archivo\n' +
      '💾 <b>/mifirmware</b> &lt;modelo&gt; — busca firmwares\n\n' +
      '<i>También escribe @este_bot en cualquier chat para buscar inline.</i>',
      { reply_markup: { inline_keyboard: [[{ text: '📁 Abrir biblioteca', url: `${getAppUrl()}/tg/archivos` }]] } },
    );
    return;
  }

  if (text.toLowerCase().startsWith('/buscar')) {
    const query = text.replace(/^\/buscar\s*/i, '').trim();
    if (!query) {
      await sendMessage(chatId, 'Uso: <b>/buscar</b> &lt;modelo o marca&gt;\nEj: <code>/buscar Samsung A55 FRP</code>');
      return;
    }
    await handleAIQuery(chatId, query);
    return;
  }

  if (text.toLowerCase().startsWith('/mifirmware')) {
    const query = text.replace(/^\/mifirmware\s*/i, '').trim();
    if (!query) {
      await sendMessage(chatId, 'Uso: <b>/mifirmware</b> &lt;modelo&gt;\nEj: <code>/mifirmware Redmi Note 12</code>');
      return;
    }
    await handleAIQuery(chatId, query, 'firmware');
    return;
  }

  if (text && !text.startsWith('/')) {
    await handleAIQuery(chatId, text);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Siempre devolver 200 a Telegram — nunca dejar que suba un 500
  try {
    if (!getToken()) {
      console.error('[telegram] TELEGRAM_BOT_TOKEN no configurado');
      return NextResponse.json({ ok: true });
    }

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const update = await req.json();
    console.log('[telegram] update type:', Object.keys(update).join(', '));

    if (update.inline_query)  await handleInlineQuery(update.inline_query);
    else if (update.message)  await handleMessage(update.message);
  } catch (e) {
    console.error('[telegram/POST]', e);
  }

  return NextResponse.json({ ok: true });
}
