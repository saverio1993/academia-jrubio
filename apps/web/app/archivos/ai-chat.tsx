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
      content: '¡Hola! Soy el asistente de la Academia. Pronto podré buscar archivos en la biblioteca por ti. Por ahora puedes escribir tu consulta y te mostraré los resultados más relevantes.',
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
      // Por ahora: búsqueda local en la BD. Luego se reemplaza por RAG con IA.
      const res = await fetch(`/api/chat/search?q=${encodeURIComponent(userMsg.content)}`);
      const data = await res.json();

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'Sin resultados.',
        timestamp: new Date(),
        sources: data.results || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Error al buscar. Intenta de nuevo.',
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
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
          <h3 className="font-semibold text-sm">Asistente IA</h3>
        </div>
        <span className="text-xs text-[var(--color-muted)]">Próximamente</span>
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
          placeholder="Pregunta algo... ej: 'firmware Samsung A55'"
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
