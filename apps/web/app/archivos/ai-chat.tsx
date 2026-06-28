'use client';

import { useState, useRef, useEffect } from 'react';
import { DownloadButton } from './download-button';

interface FileResult {
  id: string;
  title: string;
  brand: string;
  model: string | null;
  category: string;
  storageKey: string;
  sizeBytes: number | null;
  isPremium: boolean;
}

interface PostResult {
  slug: string;
  title: string;
  category: string;
  authorName: string;
  commentsCount: number;
  isResolved: boolean;
}

const FORUM_CAT: Record<string, string> = {
  frp: '🔓 FRP', imei: '📡 IMEI', flash: '💾 Flash',
  unlock: '🔑 Unlock', herramientas: '🛠️ Herramientas', general: '💬 General',
};

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: FileResult[];
  posts?: PostResult[];
}

const CAT_ICON: Record<string, string> = {
  firmware: '💾', drivers: '🔧', frp: '🔓', root: '⚡',
  dump: '💿', tutoriales: '📖', herramientas: '🛠️', unlock: '🔑',
};
const CAT_COLOR: Record<string, string> = {
  firmware:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  frp:          'bg-orange-500/10 text-orange-400 border-orange-500/20',
  root:         'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  drivers:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  unlock:       'bg-green-500/10 text-green-400 border-green-500/20',
  dump:         'bg-gray-500/10 text-gray-400 border-gray-500/20',
  tutoriales:   'bg-pink-500/10 text-pink-400 border-pink-500/20',
  herramientas: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

function bytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function RenderText({ text }: { text: string }) {
  // Detecta [texto](url) Y urls crudas https://... o http://...
  const combined = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"']+)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    if (match[1] && match[2]) {
      // markdown [texto](url)
      nodes.push(
        <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer"
           className="underline text-[var(--color-accent)] hover:opacity-75 transition-opacity font-medium break-all">
          {match[1]}
        </a>
      );
    } else {
      // URL cruda
      nodes.push(
        <a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer"
           className="underline text-[var(--color-accent)] hover:opacity-75 transition-opacity font-medium break-all">
          {match[3]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return <p className="whitespace-pre-wrap leading-relaxed">{nodes}</p>;
}

export function AIChat({ userId, hasSub }: { userId: string; hasSub: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '¡Hola! Soy el asistente de la Academia. Escribe el modelo o nombre del archivo y te ayudo a encontrarlo y descargarlo directamente.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]   = useState('');
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

      if (!res.ok) throw new Error(data.error || 'Error en la consulta');

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Sin respuesta.',
        timestamp: new Date(),
        files: data.files ?? [],
        posts: data.posts ?? [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: friendlyError(msg), timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-semibold text-sm">Asistente IA + Descarga</h3>
        </div>
        <span className="text-xs text-green-400">En línea</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] sm:min-h-[380px] max-h-[380px] sm:max-h-[580px]">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-[var(--color-accent)] text-white'
                  : m.role === 'system'
                  ? 'bg-white/5 text-[var(--color-muted)] text-xs italic'
                  : 'bg-white/5 text-[var(--color-fg)]'
              }`}
            >
              <RenderText text={m.content} />

              {/* Posts del foro */}
              {m.posts && m.posts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide font-semibold mb-2">
                    💬 {m.posts.length} post{m.posts.length !== 1 ? 's' : ''} del foro
                  </p>
                  {m.posts.map((p) => (
                    <a
                      key={p.slug}
                      href={`/comunidad/${p.slug}`}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold leading-snug truncate">{p.title}</p>
                        <p className="text-[9px] text-[var(--color-muted)] mt-0.5">
                          {FORUM_CAT[p.category] ?? p.category}
                          {' · '}💬 {p.commentsCount}
                          {p.isResolved ? ' · ✅ Resuelto' : ''}
                        </p>
                      </div>
                      <span className="text-[10px] text-[var(--color-accent)] font-bold shrink-0">Ver →</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Archivos encontrados — botones de descarga prominentes */}
              {m.files && m.files.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wide font-semibold mb-2">
                    {m.files.length} archivo{m.files.length !== 1 ? 's' : ''} encontrado{m.files.length !== 1 ? 's' : ''}
                  </p>
                  {m.files.map((f) => {
                    const blocked = f.isPremium && !hasSub;
                    const icon    = CAT_ICON[f.category] ?? '📄';
                    const clrCls  = CAT_COLOR[f.category] ?? 'bg-white/5 text-[var(--color-muted)] border-white/10';
                    return (
                      <div
                        key={f.id}
                        className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors overflow-hidden"
                      >
                        {/* Fila única: icono + info + botón pequeño */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-sm border ${clrCls}`}>
                            {icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[11px] font-semibold text-[var(--color-fg)] leading-tight truncate">{f.title}</span>
                              {f.isPremium && (
                                <span className="shrink-0 rounded-full bg-[var(--color-accent)]/20 px-1 py-0.5 text-[8px] font-bold text-[var(--color-accent)] uppercase">PRO</span>
                              )}
                            </div>
                            <p className="text-[9px] text-[var(--color-muted)] truncate">
                              {f.brand}{f.model ? ` · ${f.model}` : ''}{f.sizeBytes ? ` · ${bytes(f.sizeBytes)}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <DownloadButton
                              fileId={f.id}
                              storageKey={f.storageKey}
                              blocked={blocked}
                              userId={userId}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-muted)]">
              <span className="inline-block animate-pulse tracking-widest">● ● ●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-[var(--color-border)] p-3 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: firmware HONOR 90, Samsung A55 FRP…"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? '⟳' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}

function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('401') || m.includes('unauthorized')) return '⚠️ Token de IA inválido. Contacta al admin.';
  if (m.includes('429') || m.includes('rate limit'))   return '⏳ Demasiadas consultas. Espera un momento.';
  if (m.includes('404') || m.includes('not found'))    return '⚠️ La IA no está disponible temporalmente.';
  if (m.includes('500') || m.includes('502') || m.includes('503')) return '⚠️ La IA tuvo un error técnico. Inténtalo pronto.';
  if (m.includes('no autenticado'))  return '🔒 Inicia sesión para usar el chat.';
  if (m.includes('suscripción'))     return '⭐ El chat IA es para usuarios con suscripción activa.';
  if (m.includes('deshabilitado'))   return '⚠️ La IA no está configurada.';
  return '⚠️ No pude responder. Inténtalo de nuevo.';
}
