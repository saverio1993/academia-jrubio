'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks,
  type LocalVideoTrack,
  type LocalAudioTrack,
  type RemoteParticipant,
} from 'livekit-client';

type Status = 'idle' | 'live' | 'error';
type Resolution = '1080p' | '720p' | '480p' | '360p';

const RES_MAP: Record<Resolution, { width: number; height: number; frameRate: number }> = {
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
  '720p':  { width: 1280, height: 720,  frameRate: 30 },
  '480p':  { width: 854,  height: 480,  frameRate: 30 },
  '360p':  { width: 640,  height: 360,  frameRate: 24 },
};

export function LiveBroadcaster() {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const roomRef     = useRef<Room | null>(null);
  const camRef      = useRef<LocalVideoTrack | null>(null);
  const micRef      = useRef<LocalAudioTrack | null>(null);
  const screenRef   = useRef<LocalVideoTrack | null>(null);

  const [status,      setStatus]      = useState<Status>('idle');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [resolution,  setResolution]  = useState<Resolution>('720p');
  const [viewers,     setViewers]     = useState(0);
  const [error,       setError]       = useState('');

  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [sharing,  setSharing]  = useState(false);
  const [duration, setDuration] = useState(0);

  // Temporizador de duración
  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  async function startLive() {
    if (!title.trim()) { setError('Escribe un título para el live'); return; }
    setError('');

    try {
      await fetch('/api/livekit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      const { token, url } = await fetch('/api/livekit/token?role=broadcaster').then(r => r.json());

      const [videoTrack, audioTrack] = await Promise.all([
        createLocalVideoTrack(RES_MAP[resolution]),
        createLocalAudioTrack(),
      ]);
      camRef.current = videoTrack;
      micRef.current = audioTrack;

      if (videoRef.current) videoTrack.attach(videoRef.current);

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected,    (_p: RemoteParticipant) => setViewers(v => v + 1));
      room.on(RoomEvent.ParticipantDisconnected, (_p: RemoteParticipant) => setViewers(v => Math.max(0, v - 1)));

      await room.connect(url, token);
      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);

      setViewers(room.remoteParticipants.size);
      setStatus('live');
      setDuration(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar');
      setStatus('error');
    }
  }

  async function stopLive() {
    camRef.current?.stop();
    micRef.current?.stop();
    screenRef.current?.stop();
    if (videoRef.current) videoRef.current.srcObject = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    camRef.current = null;
    micRef.current = null;
    screenRef.current = null;

    await fetch('/api/livekit/stop', { method: 'POST' }).catch(() => null);

    setStatus('idle');
    setViewers(0);
    setSharing(false);
    setMicOn(true);
    setCamOn(true);
  }

  async function toggleMic() {
    const mic = micRef.current;
    if (!mic) return;
    if (micOn) { await mic.mute(); setMicOn(false); }
    else { await mic.unmute(); setMicOn(true); }
  }

  async function toggleCam() {
    const cam = camRef.current;
    if (!cam || sharing) return;
    if (camOn) { await cam.mute(); setCamOn(false); }
    else { await cam.unmute(); setCamOn(true); }
  }

  async function toggleScreenShare() {
    const room = roomRef.current;
    const cam  = camRef.current;
    if (!room || !cam) return;

    if (sharing) {
      // Volver a cámara
      const screen = screenRef.current;
      if (screen) {
        await room.localParticipant.unpublishTrack(screen);
        screen.stop();
        screenRef.current = null;
      }
      await room.localParticipant.publishTrack(cam);
      if (videoRef.current) cam.attach(videoRef.current);
      setSharing(false);
    } else {
      // Compartir pantalla
      try {
        const [screenTrack] = await createLocalScreenTracks({ audio: false });
        screenRef.current = screenTrack as LocalVideoTrack;
        await room.localParticipant.unpublishTrack(cam);
        await room.localParticipant.publishTrack(screenRef.current);
        if (videoRef.current) screenRef.current.attach(videoRef.current);
        setSharing(true);

        // Auto-revertir cuando el usuario cierra compartir
        screenRef.current.on('ended', async () => {
          if (sharing) await toggleScreenShare();
        });
      } catch {}
    }
  }

  useEffect(() => () => { stopLive(); }, []);

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-black mx-auto"
           style={{ aspectRatio: '16/9' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

        {status !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/30 text-sm">Vista previa de cámara</p>
          </div>
        )}

        {status === 'live' && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-red-600">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> EN VIVO
              </span>
              <span className="rounded-full px-2 py-1 text-xs text-white bg-black/50 font-mono">
                {formatTime(duration)}
              </span>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium text-white bg-black/50">
              {viewers} {viewers === 1 ? 'espectador' : 'espectadores'}
            </span>
          </div>
        )}

        {/* Indicador pantalla compartida */}
        {sharing && (
          <div className="absolute bottom-3 left-3">
            <span className="rounded-full px-3 py-1 text-xs font-bold text-white bg-blue-600">
              🖥 Pantalla compartida
            </span>
          </div>
        )}

        {/* Cámara apagada */}
        {!camOn && !sharing && status === 'live' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <span className="text-4xl">📷</span>
              <p className="text-white/60 text-sm mt-2">Cámara desactivada</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Controles durante el live ── */}
      {status === 'live' && (
        <div className="max-w-2xl mx-auto">
          {/* Barra de controles */}
          <div className="flex items-center justify-center gap-3 flex-wrap">

            {/* Micrófono */}
            <button
              onClick={toggleMic}
              title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
              className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-medium transition-all ${
                micOn
                  ? 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]'
                  : 'bg-red-600/20 border border-red-500/50 text-red-400'
              }`}
            >
              {micOn ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              )}
              {micOn ? 'Micro' : 'Sin micro'}
            </button>

            {/* Cámara */}
            <button
              onClick={toggleCam}
              disabled={sharing}
              title={camOn ? 'Apagar cámara' : 'Encender cámara'}
              className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-medium transition-all disabled:opacity-40 ${
                camOn && !sharing
                  ? 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-[var(--color-accent)]'
                  : 'bg-red-600/20 border border-red-500/50 text-red-400'
              }`}
            >
              {camOn ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                </svg>
              )}
              {camOn ? 'Cámara' : 'Sin cámara'}
            </button>

            {/* Pantalla compartida */}
            <button
              onClick={toggleScreenShare}
              title={sharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
              className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-medium transition-all ${
                sharing
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400'
                  : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-fg)] hover:border-blue-500'
              }`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78.48-4.34 1.71-5.5 3.72.14-1.4.84-4.45 5.5-5.31V8.5L16 11l-3 3.47z"/>
              </svg>
              {sharing ? 'Compartiendo' : 'Pantalla'}
            </button>

            {/* Terminar */}
            <button
              onClick={stopLive}
              className="flex flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
              Terminar
            </button>
          </div>

          <p className="text-center text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
            Los espectadores ven tu stream en tiempo real en <b>/live</b>
          </p>
        </div>
      )}

      {/* ── Formulario de inicio ── */}
      {status !== 'live' && (
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Desbloqueo Xiaomi Redmi Note 13"
              className="w-full rounded-xl border px-4 py-2.5 text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="¿Qué vas a hacer en este live?"
              className="w-full rounded-xl border px-4 py-2.5 text-sm resize-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }}
            />
          </div>

          {/* Resolución */}
          <div>
            <label className="block text-sm font-medium mb-2">Resolución de transmisión</label>
            <div className="grid grid-cols-4 gap-2">
              {(['360p', '480p', '720p', '1080p'] as Resolution[]).map(r => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                    resolution === r
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              {resolution === '1080p' && '⚠️ Requiere buena conexión (10+ Mbps subida)'}
              {resolution === '720p'  && 'Recomendado para la mayoría de conexiones'}
              {resolution === '480p'  && 'Bueno para conexiones moderadas'}
              {resolution === '360p'  && 'Para conexiones lentas'}
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={startLive}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{ background: '#ef4444' }}
          >
            Iniciar transmisión
          </button>
        </div>
      )}
    </div>
  );
}
