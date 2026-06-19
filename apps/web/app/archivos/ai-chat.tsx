'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: Array<{ id: string; title: string; brand: string; model: string | null }>;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '¡Hola! Soy el asistente de la Academia. Puedes buscar cualquier archivo más fácil escribiéndolo aquí.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Historial de la conversación (sin el welcome system message)
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const res = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.content, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la consulta');
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Sin respuesta.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      const friendly = friendlyError(msg);
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: friendly,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h3 className="font-semibold text-sm">Asistente de búsqueda con IA</h3>
        </div>
        <span className="text-xs text-green-400">En línea</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px] max-h-[600px]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-[var(--color-accent)] text-white'
                  : m.role === 'system'
                  ? 'bg-white/5 text-[var(--color-muted)] text-xs italic'
                  : 'bg-white/5 text-[var(--color-fg)]'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>

              {/* Sources - archivos encontrados */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2">
                  {m.sources.map((s) => (
                    <Link
                      key={s.id}
                      href={`/archivos?q=${encodeURIComponent(s.title)}`}
                      className="block text-xs bg-white/5 hover:bg-white/10 rounded px-2 py-1.5 transition-colors"
                    >
                      <span className="text-[var(--color-accent)]">📄 {s.title}</span>
                      <span className="text-[var(--color-muted)] ml-2">
                        {s.brand} {s.model && `· ${s.model}`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-lg px-3 py-2 text-sm text-[var(--color-muted)]">
              <span className="inline-block animate-pulse">● ● ●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-[var(--color-border)] p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="OK, pregunta algo…"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('api 401') || m.includes('unauthorized') || m.includes('login fail')) {
    return '⚠️ El token de la IA no es válido. Contacta al administrador.';
  }
  if (m.includes('api 429') || m.includes('rate limit')) {
    return '⏳ Demasiadas consultas. Espera un momento e inténtalo de nuevo.';
  }
  if (m.includes('api 404') || m.includes('not found')) {
    return '⚠️ La IA no está disponible temporalmente. Inténtalo más tarde.';
  }
  if (m.includes('api 500') || m.includes('api 502') || m.includes('api 503')) {
    return '⚠️ La IA tuvo un problema técnico. Inténtalo en un momento.';
  }
  if (m.includes('no autenticado')) {
    return '🔒 Inicia sesión para usar el chat.';
  }
  if (m.includes('suscripción')) {
    return '⭐ El chat IA es para usuarios con suscripción activa.';
  }
  if (m.includes('deshabilitado') || m.includes('no configurada')) {
    return '⚠️ La IA no está configurada. Contacta al administrador.';
  }
  return '⚠️ No pude responder. Inténtalo de nuevo.';
}
