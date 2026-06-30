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
type Quality = 'auto' | 'high' | 'medium' | 'low';

const QUALITY_MAP: Record<Quality, VideoQuality | undefined> = {
  auto: undefined,
  high: VideoQuality.HIGH,
  medium: VideoQuality.MEDIUM,
  low: VideoQuality.LOW,
};

const QUALITY_LABELS: Record<Quality, string> = {
  auto: 'Auto',
  high: '720p',
  medium: '480p',
  low: '240p',
};

export function LiveViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const pubRef = useRef<RemoteTrackPublication | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<Status>('connecting');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [quality, setQuality] = useState<Quality>('auto');
  const [showQuality, setShowQuality] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [pip, setPip] = useState(false);

  /* ── controles auto-hide ── */
  const resetHide = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!paused) setShowControls(false);
    }, 3000);
  }, [paused]);

  useEffect(() => {
    resetHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHide]);

  /* ── conexión LiveKit ── */
  useEffect(() => {
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (state === ConnectionState.Connected) setStatus('waiting');
      if (state === ConnectionState.Disconnected) setStatus('ended');
    });

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub: RemoteTrackPublication) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        pubRef.current = pub;
        setStatus('watching');
      }
      if (track.kind === Track.Kind.Audio && videoRef.current) {
        track.attach(videoRef.current);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        pubRef.current = null;
        setStatus('waiting');
      }
    });

    async function connect() {
      try {
        const res = await fetch('/api/livekit/token?role=viewer');
        const { token, url } = await res.json();
        await room.connect(url, token);
      } catch { setStatus('ended'); }
    }
    connect();

    return () => { room.disconnect(); };
  }, []);

  /* ── fullscreen events ── */
  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePause(); }
      if (e.code === 'KeyM') toggleMute();
      if (e.code === 'KeyF') toggleFullscreen();
      if (e.code === 'KeyP') togglePip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── acciones ── */
  function togglePause() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function changeVolume(val: number) {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    if (val === 0) { v.muted = true; setMuted(true); }
    else { v.muted = false; setMuted(false); }
  }

  function changeQuality(q: Quality) {
    setQuality(q);
    setShowQuality(false);
    const pub = pubRef.current;
    if (!pub) return;
    const qv = QUALITY_MAP[q];
    if (qv !== undefined) pub.setVideoQuality(qv);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen().catch(() => null);
    } else {
      await document.exitFullscreen().catch(() => null);
    }
  }

  async function togglePip() {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => null);
      setPip(false);
    } else {
      await v.requestPictureInPicture().catch(() => null);
      setPip(true);
    }
  }

  const watching = status === 'watching';

  return (
    <div>
      {/* Etiqueta de estado arriba */}
      <div className="flex items-center gap-3 mb-3 h-7">
        {watching && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-red-600">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> EN VIVO
          </span>
        )}
        {status === 'waiting' && (
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Esperando que comience la transmisión...
          </span>
        )}
      </div>

      {/* Player */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden bg-black select-none"
        style={{ aspectRatio: '16/9', cursor: showControls ? 'default' : 'none' }}
        onMouseMove={resetHide}
        onTouchStart={resetHide}
        onClick={() => { if (watching) { resetHide(); } }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          style={{ display: watching ? 'block' : 'none' }}
        />

        {/* Overlay cuando no hay stream */}
        {!watching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {status === 'connecting' && (
              <>
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Conectando...</p>
              </>
            )}
            {status === 'waiting' && (
              <>
                <span className="text-5xl">📡</span>
                <p className="text-white/50 text-sm text-center">
                  La transmisión comenzará pronto.<br />
                  <span className="text-xs opacity-70">La página se actualizará automáticamente.</span>
                </p>
              </>
            )}
            {status === 'ended' && (
              <>
                <span className="text-5xl">📴</span>
                <p className="text-white/50 text-sm">La transmisión ha finalizado</p>
              </>
            )}
          </div>
        )}

        {/* Click central para play/pause */}
        {watching && (
          <div
            className="absolute inset-0"
            onDoubleClick={toggleFullscreen}
            onClick={togglePause}
          />
        )}

        {/* Ícono de pausa central */}
        {watching && paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Controles inferiores */}
        {watching && (
          <div
            className="absolute bottom-0 left-0 right-0 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: showControls ? 1 : 0 }}
          >
            {/* Gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="relative flex items-center gap-2 px-4 pb-3 pt-8 pointer-events-auto">
              {/* Play / Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePause(); }}
                className="text-white hover:text-white/80 transition-colors shrink-0"
                title={paused ? 'Reproducir (Space)' : 'Pausar (Space)'}
              >
                {paused ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                )}
              </button>

              {/* Volumen */}
              <div className="flex items-center gap-1.5 group shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="text-white hover:text-white/80 transition-colors"
                  title="Silenciar (M)"
                >
                  {muted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  )}
                </button>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={e => { e.stopPropagation(); changeVolume(Number(e.target.value)); }}
                  onClick={e => e.stopPropagation()}
                  className="w-0 group-hover:w-20 transition-all duration-200 accent-white cursor-pointer"
                  style={{ height: 3 }}
                />
              </div>

              {/* EN VIVO badge central */}
              <div className="flex-1 flex justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-white/80 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  En vivo
                </span>
              </div>

              {/* Calidad */}
              <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setShowQuality(q => !q)}
                  className="text-white/80 hover:text-white text-xs font-mono px-2 py-1 rounded border border-white/30 hover:border-white/60 transition-colors"
                  title="Calidad de video"
                >
                  {QUALITY_LABELS[quality]}
                </button>
                {showQuality && (
                  <div className="absolute bottom-9 right-0 rounded-xl overflow-hidden shadow-xl min-w-[90px]"
                       style={{ background: 'rgba(0,0,0,0.92)' }}>
                    {(Object.keys(QUALITY_LABELS) as Quality[]).map(q => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={`block w-full text-left px-4 py-2 text-xs transition-colors ${
                          quality === q ? 'text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {QUALITY_LABELS[q]} {quality === q && '✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              {'pictureInPictureEnabled' in document && (
                <button
                  onClick={(e) => { e.stopPropagation(); togglePip(); }}
                  className={`transition-colors shrink-0 ${pip ? 'text-white' : 'text-white/70 hover:text-white'}`}
                  title="Imagen en imagen (P)"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
                  </svg>
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="text-white/70 hover:text-white transition-colors shrink-0"
                title="Pantalla completa (F)"
              >
                {fullscreen ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Atajos de teclado */}
      {watching && (
        <p className="text-center text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
          Space: pausa · M: silenciar · F: pantalla completa · P: imagen en imagen
        </p>
      )}
    </div>
  );
}
