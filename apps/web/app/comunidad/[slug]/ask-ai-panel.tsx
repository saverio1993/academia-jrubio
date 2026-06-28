'use client';

import { useState, useRef, useTransition, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  postTitle: string;
  postContent: string;
}

export function AskAIPanel({ postTitle, postContent }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function send() {
    const query = input.trim();
    if (!query || pending) return;
    setInput('');
    setError(null);

    const next: Message[] = [...messages, { role: 'user', content: query }];
    setMessages(next);

    start(async () => {
      try {
        const res = await fetch('/api/chat/post-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            postTitle,
            postContent: postContent.slice(0, 3000),
            history: next.slice(-6),
          }),
        });
        const data = await res.json() as { reply?: string; error?: string };
        if (!res.ok || data.error) { setError(data.error ?? 'Error'); return; }
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }]);
      } catch {
        setError('Error de conexión');
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors"
        style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)' }}
      >
        🤖 Preguntar a la IA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="relative w-full sm:max-w-lg sm:rounded-2xl flex flex-col overflow-hidden"
            style={{
              maxHeight: '85vh',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0"
              style={{ background: 'rgba(139,92,246,0.08)' }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: '#8b5cf6' }}>🤖 Asistente IA</p>
                <p className="text-[10px] text-[var(--color-muted)] truncate max-w-xs">{postTitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-fg)] text-lg leading-none px-1"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🤖</p>
                  <p className="text-sm font-semibold">Tengo el contexto de este post</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Pregúntame sobre el tema, pídeme que explique algo, o pide más información.
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      m.role === 'user'
                        ? { background: 'var(--color-accent)', color: '#fff' }
                        : { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-fg)' }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {pending && (
                <div className="flex justify-start">
                  <div
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                  >
                    <span className="animate-pulse text-[var(--color-muted)]">Pensando…</span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[var(--color-border)] shrink-0 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Pregunta sobre este post…"
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)]"
              />
              <button
                onClick={send}
                disabled={pending || !input.trim()}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-40 shrink-0"
                style={{ background: '#8b5cf6' }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
