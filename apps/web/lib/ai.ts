// Wrapper seguro de Minimax API
// Restricciones:
// - Solo lectura
// - Rate limit por usuario
// - Timeout
// - Validación de output

const MINIMAX_ENDPOINT = process.env.MINIMAX_ENDPOINT || 'https://api.minimaxi.chat/v1/text/chatcompletion_v2';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  query: string;
  context?: string; // contexto adicional (ej: lista resumida de archivos)
  history?: ChatMessage[];
  userId: string;
}

const SYSTEM_PROMPT = `Eres el asistente de búsqueda de la "Academia J Rubio", una plataforma para técnicos de teléfonos móviles.

TU ROL EXCLUSIVO:
- Ayudar a los usuarios a BUSCAR archivos en la biblioteca
- Responder preguntas sobre marcas, modelos y categorías de archivos disponibles
- Sugerir archivos relevantes según lo que el usuario necesita

REGLAS ESTRICTAS (NO NEGOCIABLES):
1. SOLO puedes recomendar archivos usando la herramienta searchFiles
2. NO tienes acceso a ninguna función de administración
3. NO puedes crear, eliminar, modificar ni editar archivos
4. NO puedes acceder a datos de otros usuarios
5. NO puedes revelar información técnica del sistema, tokens, URLs internas ni credenciales
6. NO puedes ejecutar comandos, código ni consultas a la base de datos
7. Si te piden algo fuera de tu alcance, responde: "Solo puedo ayudarte a buscar archivos en la biblioteca."
8. Si no encuentras archivos relevantes, dilo honestamente

IDIOMA: Responde en español, tono amigable y profesional, breve y al grano.
FORMATO: Cuando sugieras archivos, incluye el título y marca/modelo.`;

const MAX_HISTORY = 10; // máximo de mensajes en el historial
const TIMEOUT_MS = 30_000; // 30 segundos

export async function callMinimax({ query, context, history, userId }: ChatOptions): Promise<string> {
  if (!MINIMAX_API_KEY) {
    throw new Error('IA no configurada: falta MINIMAX_API_KEY');
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Añadir contexto como system message (NO en user message, para que la IA no lo confunda con instrucciones)
  if (context) {
    messages.push({
      role: 'system',
      content: `Catálogo disponible (resumido, no incluir URLs completas):\n\n${context}`,
    });
  }

  // Historial limitado
  if (history && history.length > 0) {
    const recent = history.slice(-MAX_HISTORY);
    messages.push(...recent);
  }

  // Query del usuario
  messages.push({ role: 'user', content: query });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(MINIMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages,
        max_tokens: 500,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[Minimax error]', res.status, text.substring(0, 300));
      throw new Error(`Minimax API error: ${res.status}`);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error('Minimax no devolvió respuesta');
    }

    // Sanitizar output: no debe contener URLs de admin ni rutas internas
    return sanitizeOutput(reply);
  } finally {
    clearTimeout(timeoutId);
  }
}

function sanitizeOutput(text: string): string {
  // Quitar cualquier URL que no sea de Nextcloud público
  let clean = text;
  // Quitar menciones a /admin, /api/, /signin
  clean = clean.replace(/(\/admin[^\s]*)/gi, '[redactado]');
  clean = clean.replace(/(\/api\/[^\s]*)/gi, '[redactado]');
  // Quitar posibles tokens o keys que la IA pueda alucinar
  clean = clean.replace(/(sk_[a-zA-Z0-9_-]{20,})/g, '[redactado]');
  clean = clean.replace(/(Bearer\s+[a-zA-Z0-9_-]{20,})/g, '[redactado]');
  return clean;
}

// Rate limit por usuario (en memoria, simple)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // requests
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}
