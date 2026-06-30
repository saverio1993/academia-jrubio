'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LiveNotification() {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const wasLiveRef = useRef(false);
  const pathname = usePathname();

  // No mostrar si ya están en /live
  const onLivePage = pathname === '/live';

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/livekit/status');
        const data: { isLive: boolean; title: string | null } = await res.json();

        if (data.isLive && !wasLiveRef.current) {
          // Acaba de empezar el live
          wasLiveRef.current = true;
          setTitle(data.title ?? 'Transmisión en vivo');
          if (!onLivePage) setShow(true);
        } else if (!data.isLive && wasLiveRef.current) {
          // Live terminó
          wasLiveRef.current = false;
          setShow(false);
        }
      } catch {}
    }

    check();
    const id = setInterval(check, 20_000);
    return () => clearInterval(id);
  }, [onLivePage]);

  if (!show || onLivePage) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
      style={{ animation: 'slideUp 0.35s ease-out' }}
    >
      <div className="flex items-center gap-1 rounded-2xl shadow-2xl overflow-hidden">
        {/* Banner principal */}
        <Link
          href="/live"
          onClick={() => setShow(false)}
          className="flex items-center gap-3 px-5 py-3 text-white"
          style={{ background: '#dc2626' }}
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">En vivo ahora</p>
            <p className="text-sm font-semibold">{title}</p>
          </div>
          <span className="ml-1 text-lg">→</span>
        </Link>

        {/* Botón cerrar */}
        <button
          onClick={() => setShow(false)}
          className="px-3 py-3 text-white/70 hover:text-white hover:bg-red-700 transition-colors self-stretch"
          style={{ background: '#b91c1c' }}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
