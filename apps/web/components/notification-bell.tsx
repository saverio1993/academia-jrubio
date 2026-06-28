'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notif {
  id: string;
  title: string;
  body: string;
  read: boolean;
  fileItemId: string | null;
  postSlug: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [unread, setUnread]       = useState(0);
  const ref                       = useRef<HTMLDivElement>(null);
  const router                    = useRouter();

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notif[]; unread: number };
      setNotifs(data.notifications);
      setUnread(data.unread);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }), headers: { 'Content-Type': 'application/json' } });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  function handleNotifClick(n: Notif) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.postSlug) router.push(`/comunidad/${n.postSlug}`);
    else if (n.fileItemId) router.push('/archivos');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
        title="Notificaciones"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[var(--color-accent)] text-white text-[9px] font-bold flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-sm font-semibold">Notificaciones</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-[var(--color-accent)] hover:underline">
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-center text-xs text-[var(--color-muted)] py-8">Sin notificaciones</p>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-white/5 transition-colors ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />}
                    {n.read  && <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug">{n.title}</p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5 leading-snug">{n.body}</p>
                    </div>
                    <span className="text-[10px] text-[var(--color-muted)] shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
