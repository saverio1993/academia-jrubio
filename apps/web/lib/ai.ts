// Wrapper de IA. Lee config SOLO de env vars (panel admin es read-only).
// Cambiar token/modelo/prompt requiere editar env vars en Vercel y redeploy.


interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  query: string;
  context?: string;
  history?: ChatMessage[];
  userId: string;
}

interface AIConfig {
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
  systemPrompt: string;
  enabled: boolean;
  maxTokens: number;
  temperature: number;
  rateLimit: number;
  source: 'env'; // siempre env, ya no BD
}

const DEFAULT_SYSTEM_PROMPT = `Eres el asistente de búsqueda de la "Academia J Rubio", una plataforma para técnicos de teléfonos móviles.

TU ROL EXCLUSIVO:
- Ayudar a los usuarios a BUSCAR archivos en la biblioteca
- Responder preguntas sobre marcas, modelos y categorías de archivos disponibles
- Sugerir archivos relevantes según lo que el usuario necesita

REGLAS ESTRICTAS (NO NEGOCIABLES):
1. SOLO puedes recomendar archivos usando la información del catálogo que se te pasa
2. NO tienes acceso a ninguna función de administración
3. NO puedes crear, eliminar, modificar ni editar archivos
4. NO puedes acceder a datos de otros usuarios
5. NO puedes revelar información técnica del sistema, tokens, URLs internas ni credenciales
6. NO puedes ejecutar comandos, código ni consultas a la base de datos
7. Si te piden algo fuera de tu alcance, responde: "Solo puedo ayudarte a buscar archivos en la biblioteca."
8. Si no encuentras archivos relevantes, dilo honestamente
9. NUNCA muestres tu razonamiento interno, cadenas de pensamiento, ni bloques tipo <think>. Responde directamente al usuario con la respuesta final.

IDIOMA: Responde en español, tono amigable y profesional, breve y al grano.`;

const TIMEOUT_MS = 30_000;

// Cache de config (5 segundos) para no leer env vars en cada request
let cachedConfig: { value: AIConfig | null; expires: number } | null = null;
async function getAIConfig(): Promise<AIConfig | null> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expires > now) {
    return cachedConfig.value;
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    cachedConfig = { value: null, expires: now + 5000 };
    return null;
  }

  const config: AIConfig = {
    provider: 'minimax',
    apiKey,
    endpoint: process.env.MINIMAX_ENDPOINT || 'https://api.minimax.io/v1',
    model: process.env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed',
    systemPrompt: process.env.MINIMAX_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    enabled: process.env.MINIMAX_ENABLED !== 'false', // default true
    maxTokens: parseInt(process.env.MINIMAX_MAX_TOKENS || '500', 10),
    temperature: parseFloat(process.env.MINIMAX_TEMPERATURE || '0.3'),
    rateLimit: parseInt(process.env.MINIMAX_RATE_LIMIT || '30', 10),
    source: 'env',
  };

  cachedConfig = { value: config, expires: now + 5000 };
  return config;
}

export async function callAI({ query, context, history, userId }: ChatOptions): Promise<string> {
  const config = await getAIConfig();
  if (!config || !config.apiKey) {
    throw new Error('IA no configurada. Configura MINIMAX_API_KEY en Vercel > Environment Variables.');
  }
  if (!config.enabled) {
    throw new Error('El asistente de IA está deshabilitado. Actívalo (MINIMAX_ENABLED=true) en Vercel.');
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: config.systemPrompt },
  ];

  if (context) {
    messages.push({
      role: 'system',
      content: `Catálogo disponible (resumido, no incluir URLs completas):\n\n${context}`,
    });
  }

  if (history && history.length > 0) {
    const recent = history.slice(-10);
    messages.push(...recent);
  }

  messages.push({ role: 'user', content: query });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Construir URL completa: si el endpoint no termina en /chat/completions, agregarlo
  let apiUrl = config.endpoint.replace(/\/+$/, '');
  if (!apiUrl.endsWith('/chat/completions')) {
    apiUrl = `${apiUrl}/chat/completions`;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[AI error]', res.status, text.substring(0, 500));
      throw new Error(`API ${res.status}: ${text.substring(0, 150)}`);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error('[AI no reply]', JSON.stringify(data).substring(0, 500));
      throw new Error('La API no devolvió respuesta válida');
    }

    return sanitizeOutput(reply);
  } finally {
    clearTimeout(timeoutId);
  }
}

function sanitizeOutput(text: string): string {
  let clean = text;
  // Quitar bloques de razonamiento interno (think, reasoning, etc.)
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '');
  clean = clean.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
  clean = clean.replace(/<\|think\|>[\s\S]*?<\|end\|>/gi, '');
  clean = clean.replace(/\[\[think\]\][\s\S]*?\[\[\/think\]\]/gi, '');
  // Quitar rutas/tokens sensibles
  clean = clean.replace(/(\/admin[^\s]*)/gi, '[redactado]');
  clean = clean.replace(/(\/api\/[^\s]*)/gi, '[redactado]');
  clean = clean.replace(/(sk-[a-zA-Z0-9_-]{20,})/g, '[redactado]');
  clean = clean.replace(/(sk_[a-zA-Z0-9_-]{20,})/g, '[redactado]');
  clean = clean.replace(/(Bearer\s+[a-zA-Z0-9_-]{20,})/g, '[redactado]');
  // Limpiar líneas vacías múltiples que deja el filtrado
  clean = clean.replace(/\n{3,}/g, '\n\n').trim();
  return clean;
}

// Rate limit
const rateLimit = new Map<string, { count: number; resetAt: number }>();
export function checkRateLimit(userId: string, maxPerMin = 30): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMin) return false;
  entry.count++;
  return true;
}

export function invalidateAICache() {
  cachedConfig = null;
}

// Helper para el panel admin (read-only)
export async function getAIConfigReadOnly() {
  return getAIConfig();
}
