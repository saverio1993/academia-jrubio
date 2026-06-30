'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  VideoQuality,
  type RemoteTrack,
  type RemoteTrackPublication,
  ConnectionState,
} from 'livekit-client';

type Status = 'connecting' | 'waiting' | 'watching' | 'ended';
type Quality = 'high' | 'medium' | 'low';

const QUALITY_MAP: Record<Quality, VideoQuality> = {
  high:   VideoQuality.HIGH,
  medium: VideoQuality.MEDIUM,
  low:    VideoQuality.LOW,
};
const QUALITY_LABELS: Record<Quality, string> = {
  high:   'Alta',
  medium: 'Media',
  low:    'Baja',
};

interface ChatMsg {
  id: string; name: string; text: string; ts: number; broadcaster?: boolean;
  msgType?: 'link' | 'file';
  url?: string;
  fileSize?: number;
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/* Detectar si el dispositivo es táctil (móvil/tablet).
   En estos dispositivos usamos fake-fullscreen (CSS position:fixed) en vez
   de la Fullscreen API nativa, porque en iOS el player nativo congela
   MediaStreams al rotar la orientación. */
function isTouchDevice() {
  return typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function LiveViewer() {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef      = useRef<Room | null>(null);
  const pubRef       = useRef<RemoteTrackPublication | null>(null);
  const hideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef   = useRef<HTMLDivElement>(null);

  /* Ref paralelo al estado fullscreen para usarlo en callbacks sin deps */
  const fullscreenRef = useRef(false);

  const [status,      setStatus]      = useState<Status>('connecting');
  const [paused,      setPaused]      = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [volume,      setVolume]      = useState(1);
  const [quality,     setQuality]     = useState<Quality>('high');
  const [showQuality, setShowQuality] = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [msgs,        setMsgs]        = useState<ChatMsg[]>([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatName,    setChatName]    = useState('');
  const [nameSet,     setNameSet]     = useState(false);
  const [rxRes,       setRxRes]       = useState<string>('');

  /* Sincronizar ref con state */
  useEffect(() => { fullscreenRef.current = fullscreen; }, [fullscreen]);

  /* Limpiar overflow al desmontar */
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  /* ── auto-hide controles (solo en fullscreen) ── */
  const resetHide = useCallback(() => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (fullscreenRef.current) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 3500);
    }
  }, []);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  /* Auto-hide se activa/desactiva cuando fullscreen cambia */
  useEffect(() => {
    if (fullscreen) {
      resetHide();
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowCtrl(true);
    }
  }, [fullscreen, resetHide]);

  /* ── scroll chat al final ── */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  /* ── Fullscreen real (desktop) via Fullscreen API ── */
  useEffect(() => {
    const onFsChange = () => {
      const isFull = Boolean(document.fullscreenElement) ||
        Boolean((document as never as { webkitFullscreenElement: Element | null }).webkitFullscreenElement);
      setFullscreen(isFull);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  /* ── LiveKit conexión ── */
  useEffect(() => {
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
      if (s === ConnectionState.Connected)    setStatus('waiting');
      if (s === ConnectionState.Disconnected) setStatus('ended');
    });

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        pubRef.current = pub;
        pub.setVideoQuality(VideoQuality.HIGH);
        setStatus('watching');
        const readRes = () => {
          const v = videoRef.current;
          if (v && v.videoWidth > 0) setRxRes(`${v.videoWidth}×${v.videoHeight}`);
        };
        videoRef.current.addEventListener('loadedmetadata', readRes);
        videoRef.current.addEventListener('resize', readRes);
      }
      if (track.kind === Track.Kind.Audio && videoRef.current) track.attach(videoRef.current);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        track.detach(); pubRef.current = null; setStatus('waiting'); setRxRes('');
      }
    });

    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(dec.decode(payload));
        if (msg.type === 'chat') {
          setMsgs(prev => [...prev.slice(-199), { id: crypto.randomUUID(), name: msg.name, text: msg.text, ts: msg.ts, broadcaster: msg.broadcaster }]);
        } else if (msg.type === 'link') {
          setMsgs(prev => [...prev.slice(-199), { id: crypto.randomUUID(), name: msg.name, text: msg.label || msg.url, ts: msg.ts, broadcaster: true, msgType: 'link', url: msg.url }]);
        } else if (msg.type === 'file') {
          setMsgs(prev => [...prev.slice(-199), { id: crypto.randomUUID(), name: msg.name, text: msg.filename, ts: msg.ts, broadcaster: true, msgType: 'file', url: msg.url, fileSize: msg.size }]);
        }
      } catch {}
    });

    (async () => {
      try {
        const { token, url } = await fetch('/api/livekit/token?role=viewer').then(r => r.json());
        await room.connect(url, token);
      } catch { setStatus('ended'); }
    })();

    return () => { room.disconnect(); };
  }, []);

  /* ── acciones video ── */
  function togglePause() {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  }
  function toggleMute() {
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  }
  function changeVolume(val: number) {
    const v = videoRef.current; if (!v) return;
    v.volume = val; setVolume(val);
    v.muted = val === 0; setMuted(val === 0);
  }
  function changeQuality(q: Quality) {
    setQuality(q); setShowQuality(false);
    if (pubRef.current) pubRef.current.setVideoQuality(QUALITY_MAP[q]);
  }

  /* ── Fullscreen toggle ──
     En dispositivos táctiles usamos "fake fullscreen" (position:fixed via CSS)
     para evitar que iOS congele el stream al rotar la orientación.
     En escritorio usamos la Fullscreen API real. */
  const toggleFullscreen = useCallback(async () => {
    if (isTouchDevice()) {
      setFullscreen(prev => {
        const next = !prev;
        document.body.style.overflow = next ? 'hidden' : '';
        return next;
      });
      return;
    }
    const c = containerRef.current;
    if (!document.fullscreenElement) await c?.requestFullscreen().catch(() => null);
    else await document.exitFullscreen().catch(() => null);
  }, []);

  async function togglePip() {
    const v = videoRef.current; if (!v) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture().catch(() => null);
    else await v.requestPictureInPicture().catch(() => null);
  }

  /* ── atajos teclado (solo desktop) ── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyM') toggleMute();
      if (e.code === 'KeyF') toggleFullscreen();
      if (e.code === 'KeyP') togglePip();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [toggleFullscreen]);

  /* ── chat ── */
  async function sendChat() {
    const text = chatInput.trim();
    const name = chatName.trim() || 'Espectador';
    if (!text || !roomRef.current) return;
    const payload = enc.encode(JSON.stringify({ type: 'chat', name, text, ts: Date.now() }));
    await roomRef.current.localParticipant.publishData(payload, { reliable: true });
    setMsgs(prev => [...prev.slice(-199), { id: crypto.randomUUID(), name, text, ts: Date.now() }]);
    setChatInput('');
    if (!nameSet) setNameSet(true);
  }

  const watching = status === 'watching';

  return (
    <div className="flex flex-col xl:flex-row gap-3 sm:gap-4">

      {/* ── Columna izquierda: badge + player ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 sm:gap-3">

        {/* Badge estado */}
        <div className="flex items-center gap-2 sm:gap-3 h-7">
          {watching && (
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-red-600">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> EN VIVO
            </span>
          )}
          {watching && rxRes && (
            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              {rxRes}
            </span>
          )}
          {status === 'waiting' && (
            <span className="text-sm truncate" style={{ color: 'var(--color-muted)' }}>Esperando transmisión...</span>
          )}
        </div>

        {/* ── PLAYER ──
            En fake-fullscreen móvil: position:fixed inset-0 z-[9999]
            En normal: w-full aspect-ratio:16/9
            El <video> nunca sale del DOM, por eso no congela al rotar. */}
        <div
          ref={containerRef}
          className={`relative overflow-hidden bg-black select-none ${
            fullscreen
              ? 'fixed inset-0 z-[9999] rounded-none'
              : 'w-full rounded-xl sm:rounded-2xl'
          }`}
          style={fullscreen ? {} : { aspectRatio: '16/9' }}
          onMouseMove={resetHide}
          onTouchStart={resetHide}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            onClick={watching ? togglePause : undefined}
            onDoubleClick={watching ? toggleFullscreen : undefined}
            className="w-full h-full object-contain"
            style={{ display: watching ? 'block' : 'none', cursor: 'pointer' }}
          />

          {/* Overlay sin stream */}
          {!watching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {status === 'connecting' && (
                <><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /><p className="text-white/50 text-sm">Conectando...</p></>
              )}
              {status === 'waiting' && (
                <><span className="text-4xl sm:text-5xl">📡</span><p className="text-white/50 text-sm text-center px-4">La transmisión comenzará pronto.</p></>
              )}
              {status === 'ended' && (
                <><span className="text-4xl sm:text-5xl">📴</span><p className="text-white/50 text-sm">La transmisión ha finalizado</p></>
              )}
            </div>
          )}

          {/* Ícono pausa central */}
          {watching && paused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          )}

          {/* ── BARRA DE CONTROLES ── */}
          {watching && (
            <div
              className="absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-300"
              style={{ opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? 'auto' : 'none' }}
              onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); setShowCtrl(true); }}
              onMouseLeave={resetHide}
            >
              <div className="bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-8 pb-2 sm:pb-3 px-3 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-3">

                  {/* Play/Pause */}
                  <button
                    onClick={e => { e.stopPropagation(); togglePause(); }}
                    className="text-white hover:scale-110 transition-transform shrink-0 p-1"
                    title={paused ? 'Reproducir' : 'Pausar'}
                  >
                    {paused
                      ? <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      : <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    }
                  </button>

                  {/* Mute */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleMute(); }}
                    className="text-white hover:scale-110 transition-transform shrink-0 p-1"
                    title="Silenciar"
                  >
                    {muted || volume === 0
                      ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                      : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    }
                  </button>

                  {/* Slider volumen — solo en pantallas sm+ */}
                  <div className="hidden sm:block shrink-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={muted ? 0 : volume}
                      onChange={e => changeVolume(Number(e.target.value))}
                      className="w-20 cursor-pointer accent-white"
                      style={{ height: 3 }}
                    />
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Calidad */}
                  <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setShowQuality(q => !q)}
                      className="text-white/80 hover:text-white text-xs font-mono px-2 py-1 rounded border border-white/30 hover:border-white transition-colors"
                    >
                      {QUALITY_LABELS[quality]}
                    </button>
                    {showQuality && (
                      <div className="absolute bottom-9 right-0 rounded-xl overflow-hidden shadow-2xl min-w-[88px] border border-white/10"
                           style={{ background: 'rgba(10,10,10,0.95)' }}>
                        {(Object.keys(QUALITY_LABELS) as Quality[]).map(q => (
                          <button key={q} onClick={() => changeQuality(q)}
                            className={`block w-full text-left px-4 py-2.5 text-xs transition-colors ${quality === q ? 'text-white font-bold bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                            {QUALITY_LABELS[q]} {quality === q && '✓'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PiP — solo desktop */}
                  {'pictureInPictureEnabled' in document && (
                    <button
                      onClick={e => { e.stopPropagation(); togglePip(); }}
                      className="hidden sm:block text-white/70 hover:text-white hover:scale-110 transition-all shrink-0 p-1"
                      title="Imagen en imagen (P)"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>
                    </button>
                  )}

                  {/* Fullscreen */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
                    className="text-white/70 hover:text-white hover:scale-110 transition-all shrink-0 p-1"
                    title="Pantalla completa"
                  >
                    {fullscreen
                      ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                      : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Atajos teclado — solo desktop */}
        <p className="hidden sm:block text-center text-xs" style={{ color: 'var(--color-muted)' }}>
          Space: pausa · M: silenciar · F: pantalla completa · P: imagen en imagen
        </p>
      </div>

      {/* ── Columna derecha: chat ── */}
      <div className="xl:w-80 2xl:w-96 shrink-0 flex flex-col">
        <div className="rounded-xl sm:rounded-2xl border overflow-hidden flex flex-col flex-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-bold">💬 Chat en vivo</span>
            {msgs.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>
                {msgs.length}
              </span>
            )}
          </div>

          {/* Mensajes */}
          <div className="h-48 sm:h-64 xl:flex-1 xl:h-auto overflow-y-auto px-3 sm:px-4 py-2 sm:py-3 space-y-2 flex flex-col">
            {msgs.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Sé el primero en comentar 👋</p>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id}>
                {m.msgType === 'link' || m.msgType === 'file' ? (
                  <div className="rounded-xl p-2.5 my-1" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-accent)', borderLeft: '3px solid var(--color-accent)' }}>
                    <p className="text-[10px] font-bold mb-1" style={{ color: 'var(--color-accent)' }}>
                      {m.msgType === 'link' ? '🔗 Enlace compartido' : '📁 Archivo compartido'} — {m.name}
                    </p>
                    <p className="text-xs font-medium mb-2 truncate" style={{ color: 'var(--color-fg)' }}>
                      {m.text}
                      {m.fileSize ? <span className="ml-1 font-normal opacity-60">({fmtBytes(m.fileSize)})</span> : null}
                    </p>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={m.msgType === 'file'}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {m.msgType === 'file'
                        ? <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Descargar</>
                        : <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59L7.76 14.83l1.41 1.41L19 5.41V9h2V3h-7z"/></svg> Abrir enlace</>
                      }
                    </a>
                  </div>
                ) : (
                  <div className="flex gap-2 text-sm">
                    <span className={`font-bold shrink-0 ${m.broadcaster ? 'text-[var(--color-accent)]' : ''}`}>
                      {m.broadcaster ? '🎙 ' : ''}{m.name}:
                    </span>
                    <span style={{ color: 'var(--color-fg)' }}>{m.text}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Nombre (solo primera vez) */}
          {!nameSet && (
            <div className="px-3 sm:px-4 py-2 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <input
                value={chatName}
                onChange={e => setChatName(e.target.value)}
                placeholder="Tu nombre (opcional)"
                maxLength={24}
                className="w-full rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }}
                onKeyDown={e => { if (e.key === 'Enter') setNameSet(true); }}
              />
            </div>
          )}

          {/* Input mensaje */}
          <div className="flex gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={watching ? 'Escribe un mensaje...' : 'Chat activo durante el live'}
              disabled={!watching}
              maxLength={200}
              className="flex-1 rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            />
            <button
              onClick={sendChat}
              disabled={!watching || !chatInput.trim()}
              className="rounded-xl px-3 sm:px-4 py-2 text-sm font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
              style={{ background: 'var(--color-accent)' }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
