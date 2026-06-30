'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
  type LocalVideoTrack,
  type RemoteParticipant,
} from 'livekit-client';

type Status = 'idle' | 'live' | 'error';

export function LiveBroadcaster() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState('');

  async function startLive() {
    if (!title.trim()) { setError('Escribe un título para el live'); return; }
    setError('');

    try {
      // 1. Registrar en DB y enviar notif Telegram
      await fetch('/api/livekit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      // 2. Obtener token de broadcaster
      const res = await fetch('/api/livekit/token?role=broadcaster');
      const { token, url } = await res.json();

      // 3. Crear tracks locales
      const [videoTrack, audioTrack] = await Promise.all([
        createLocalVideoTrack({ resolution: { width: 1280, height: 720, frameRate: 30 } }),
        createLocalAudioTrack(),
      ]);
      videoTrackRef.current = videoTrack;

      // 4. Preview local
      if (videoRef.current) videoTrack.attach(videoRef.current);

      // 5. Conectar y publicar
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) =>
        setViewers(v => v + 1)
      );
      room.on(RoomEvent.ParticipantDisconnected, (_p: RemoteParticipant) =>
        setViewers(v => Math.max(0, v - 1))
      );
      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        setViewers(0);
      });

      await room.connect(url, token);
      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);

      // Contar viewers ya conectados
      setViewers(room.remoteParticipants.size);
      setStatus('live');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar la transmisión');
      setStatus('error');
    }
  }

  async function stopLive() {
    videoTrackRef.current?.stop();
    if (videoRef.current) videoRef.current.srcObject = null;
    roomRef.current?.disconnect();
    roomRef.current = null;

    await fetch('/api/livekit/stop', { method: 'POST' }).catch(() => null);

    setStatus('idle');
    setViewers(0);
  }

  useEffect(() => () => { stopLive(); }, []);

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-black mx-auto"
        style={{ aspectRatio: '16/9' }}
      >
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

        {status !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/30 text-sm">Vista previa de cámara</p>
          </div>
        )}

        {status === 'live' && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-red-600">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              EN VIVO
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-medium text-white bg-black/50">
              {viewers} {viewers === 1 ? 'espectador' : 'espectadores'}
            </span>
          </div>
        )}
      </div>

      {/* Controles */}
      {status !== 'live' ? (
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={startLive}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{ background: '#ef4444' }}
          >
            Iniciar transmisión
          </button>
        </div>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {viewers} {viewers === 1 ? 'persona viendo' : 'personas viendo'}
          </p>
          <button
            onClick={stopLive}
            className="mt-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-muted)' }}
          >
            Detener transmisión
          </button>
        </div>
      )}
    </div>
  );
}
