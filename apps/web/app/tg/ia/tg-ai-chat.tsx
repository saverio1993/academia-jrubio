'use client';

import { useState, useRef, useEffect } from 'react';

interface FileResult {
  id: string; title: string; brand: string; model: string | null;
  category: string; storageKey: string; sizeBytes: number | null; isPremium: boolean;
}
interface PostResult {
  slug: string; title: string; category: string;
  authorName: string; commentsCount: number; isResolved: boolean;
}
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: FileResult[];
  posts?: PostResult[];
}

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};

export function TgAiChat({ userName }: { userName?: string | null }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'sys',
      role: 'system',
      content: `Hola${userName ? ` ${userName.split(' ')[0]}` : ''}! 👋 Soy el asistente de Academia J Rubio. Pregúntame sobre archivos, técnicas de reparación, FRP, firmware y más.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, history }),
      });

      const data = await res.json() as { reply?: string; files?: FileResult[]; posts?: PostResult[]; error?: string };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.error ?? data.reply ?? 'Sin respuesta.',
        files: data.files,
        posts: data.posts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 border-b border-[var(--color-border)]"
        style={{ background: 'var(--color-bg)' }}
      >
        <h1 className="text-sm font-bold">🤖 Asistente IA</h1>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
          Busca archivos, técnicas y respuestas del foro
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id}>
            {m.role === 'system' ? (
              <div
                className="text-center text-[11px] px-4 py-2 rounded-xl border border-[var(--color-border)]"
                style={{ background: 'var(--color-card)', color: 'var(--color-muted)' }}
              >
                {m.content}
              </div>
            ) : m.role === 'user' ? (
              <div className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-white"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[90%] space-y-2">
                  <div
                    className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-wrap border border-[var(--color-border)]"
                    style={{ background: 'var(--color-card)' }}
                  >
                    {m.content}
                  </div>
                  {/* File results */}
                  {m.files && m.files.length > 0 && (
                    <div className="space-y-1.5">
                      {m.files.slice(0, 4).map((f) => (
                        <a
                          key={f.id}
                          href={`/tg/archivos?q=${encodeURIComponent(f.title)}`}
                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-[var(--color-border)] text-xs"
                          style={{ background: 'var(--color-card)' }}
                        >
                          <span>{CAT_ICON[f.category] ?? '📄'}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{f.title}</p>
                            <p style={{ color: 'var(--color-muted)' }}>{f.brand}{f.model ? ` · ${f.model}` : ''}</p>
                          </div>
                          <span style={{ color: 'var(--color-accent)' }}>→</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {/* Post results */}
                  {m.posts && m.posts.length > 0 && (
                    <div className="space-y-1.5">
                      {m.posts.slice(0, 3).map((p) => (
                        <a
                          key={p.slug}
                          href={`/comunidad/${p.slug}`}
                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-purple-500/20 text-xs"
                          style={{ background: 'rgba(139,92,246,0.08)' }}
                        >
                          <span>💬</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{p.title}</p>
                            <p style={{ color: 'var(--color-muted)' }}>
                              {p.commentsCount} respuestas{p.isResolved ? ' · ✅' : ''}
                            </p>
                          </div>
                          <span style={{ color: '#8b5cf6' }}>→</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm border border-[var(--color-border)]"
              style={{ background: 'var(--color-card)', color: 'var(--color-muted)' }}
            >
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 p-3 border-t border-[var(--color-border)] flex gap-2 items-end"
        style={{ background: 'var(--color-bg)' }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe tu pregunta…"
          rows={1}
          disabled={loading}
          className="flex-1 resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center transition-opacity disabled:opacity-40"
          style={{ background: 'var(--color-accent)' }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
