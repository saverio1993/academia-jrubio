import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@academia/db';

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

// Catálogo plano para contexto IA — lista todos los títulos con marca/categoría
async function buildCatalogContext(categoryFilter?: string) {
  const catalog = await prisma.fileItem.findMany({
    where: categoryFilter ? { category: categoryFilter } : undefined,
    select: { title: true, brand: true, model: true, category: true },
    take: 400,
    orderBy: { downloadsCount: 'desc' },
  });
  return catalog
    .map(f => `- ${f.title} [${f.brand ?? ''}${f.model ? ` · ${f.model}` : ''} · ${f.category}]`)
    .join('\n');
}

// Busca archivos por lista de títulos exactos que devuelve la IA
async function findFilesByTitles(titles: string[]) {
  if (!titles.length) return [];
  return prisma.fileItem.findMany({
    where: { title: { in: titles } },
    select: { id: true, title: true, brand: true, model: true, category: true, isPremium: true },
    take: 6,
  });
}

// Búsqueda BD por keywords — longitud mínima 1 para incluir números ("7", "A5", etc.)
async function searchFiles(query: string, limit = 8, category?: string) {
  const STOP = new Set(['el','la','los','las','un','una','del','de','en','con','para','por','que','es','se','al','me','mi','su']);
  const keywords = query
    .split(/\s+/)
    .map(k => k.replace(/[¿?¡!.,;:]/g, '').toLowerCase())
    .filter(k => k.length > 0 && !STOP.has(k));

  if (!keywords.length) return [];

  // Búsqueda en título, marca y modelo por cada keyword
  const OR = [
    { title: { contains: query, mode: 'insensitive' as const } }, // frase completa primero
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

// Llama a MiniMax con prompt específico para bot: respuesta + lista de títulos exactos
async function callBotAI(query: string, context: string): Promise<{ reply: string; titles: string[] }> {
  const apiKey = process.env.MINIMAX_API_KEY ?? '';
  if (!apiKey) throw new Error('MINIMAX_API_KEY no configurada');

  const endpoint = (process.env.MINIMAX_ENDPOINT ?? 'https://api.minimax.io/v1').replace(/\/+$/, '');
  const model    = process.env.MINIMAX_MODEL ?? 'MiniMax-M2.7-highspeed';

  const systemPrompt = `Eres el asistente de Academia J Rubio para técnicos de móviles.
Se te proporciona el catálogo completo de archivos disponibles.

TAREA:
1. Responde brevemente la consulta del usuario (máximo 3 líneas)
2. En la ÚLTIMA línea, escribe exactamente esto con los títulos encontrados:
ARCHIVOS: Título exacto 1 | Título exacto 2 | Título exacto 3

REGLAS:
- Los títulos DEBEN ser exactamente como aparecen en el catálogo (copia y pega)
- Si no encuentras ninguno, escribe: ARCHIVOS:
- Máximo 5 archivos
- Responde en español, breve y directo
- NUNCA inventes títulos que no estén en el catálogo`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 28_000);

  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: `Catálogo disponible:\n${context}` },
          { role: 'user',   content: query },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data  = await res.json();
    const raw   = (data?.choices?.[0]?.message?.content ?? '').trim();

    // Separar respuesta de la línea ARCHIVOS:
    const lines  = raw.split('\n');
    const aIdx   = lines.findLastIndex((l: string) => l.startsWith('ARCHIVOS:'));
    const titles = aIdx >= 0
      ? lines[aIdx].replace('ARCHIVOS:', '').split('|').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const reply  = lines.slice(0, aIdx >= 0 ? aIdx : undefined).join('\n').trim()
      || 'Aquí están los archivos encontrados:';

    return { reply, titles };
  } finally {
    clearTimeout(t);
  }
}

// Teclado con un botón por archivo (link directo al título exacto)
function buildKeyboard(
  files: { id: string; title: string; category: string; isPremium: boolean }[],
  query: string,
  categoryFilter?: string,
) {
  const base = getAppUrl();
  const rows = files.map(f => {
    const icon  = CAT_ICON[f.category] ?? '📄';
    const lock  = f.isPremium ? ' 🔒' : '';
    const label = `${icon} ${f.title.slice(0, 38)}${lock}`;
    const url   = `${base}/tg/archivos?q=${encodeURIComponent(f.title)}`;
    return [{ text: label, url }];
  });

  if (!files.length || files.length >= 3) {
    const allUrl = `${base}/tg/archivos?q=${encodeURIComponent(query)}${categoryFilter ? `&cat=${categoryFilter}` : ''}`;
    rows.push([{ text: '📁 Ver todos los resultados', url: allUrl }]);
  }

  return { inline_keyboard: rows };
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
        input_message_content: { message_text: `Sin resultados para "${q}". Ver en: ${getAppUrl()}/tg/archivos` },
        reply_markup: { inline_keyboard: [[{ text: '📁 Ver biblioteca', url: `${getAppUrl()}/tg/archivos` }]] },
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
    reply_markup: { inline_keyboard: [[{ text: '📁 Ver archivo', url: `${getAppUrl()}/tg/archivos?q=${encodeURIComponent(f.title)}` }]] },
  }));

  return tg('answerInlineQuery', { inline_query_id: query.id, results, cache_time: 10 });
}

// ── Búsqueda: BD primero → IA narra los resultados → botones directos ────────
async function handleAIQuery(chatId: number, query: string, categoryFilter?: string) {
  await sendTyping(chatId);

  try {
    // 1. Buscar en BD con keywords (no depende del catálogo limitado)
    const files = await searchFiles(query, 6, categoryFilter);

    if (!files.length) {
      await sendMessage(chatId,
        `🔍 No encontré archivos para <b>${query}</b>.\nPrueba con otra búsqueda o explora la biblioteca.`,
        { reply_markup: { inline_keyboard: [[{ text: '📁 Ver biblioteca', url: `${getAppUrl()}/tg/archivos` }]] } },
      );
      return;
    }

    // 2. Pasar solo los archivos encontrados a la IA para que narre la respuesta
    const filesContext = files
      .map(f => `- ${f.title} [${f.brand ?? ''}${f.model ? ` · ${f.model}` : ''} · ${f.category}${f.isPremium ? ' · PREMIUM' : ''}]`)
      .join('\n');

    let reply = '';
    try {
      const { reply: aiReply } = await callBotAI(query, filesContext);
      reply = aiReply;
    } catch {
      // Si la IA falla, generar respuesta básica
      reply = `Encontré ${files.length} archivo${files.length > 1 ? 's' : ''} para <b>${query}</b>:`;
    }

    await sendMessage(chatId, `🤖 ${reply}`, {
      reply_markup: buildKeyboard(files, query, categoryFilter),
    });

  } catch (err) {
    console.error('[telegram/handleAIQuery]', err);
    try {
      await sendMessage(chatId,
        `❌ Error al buscar. Prueba directamente en la biblioteca.`,
        { reply_markup: { inline_keyboard: [[{ text: '📁 Ver biblioteca', url: `${getAppUrl()}/tg/archivos` }]] } },
      );
    } catch { /* silent */ }
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
      'Escríbeme directamente qué necesitas, o usa los comandos:\n\n' +
      '🔍 <b>/buscar</b> &lt;texto&gt; — busca cualquier archivo\n' +
      '💾 <b>/mifirmware</b> &lt;modelo&gt; — busca firmwares\n\n' +
      '<i>También escribe @academiabot en cualquier chat para buscar inline.</i>',
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

    if (update.inline_query)  await handleInlineQuery(update.inline_query);
    else if (update.message)  await handleMessage(update.message);
  } catch (e) {
    console.error('[telegram/POST]', e);
  }

  return NextResponse.json({ ok: true });
}
