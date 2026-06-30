'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
  ConnectionState,
} from 'livekit-client';

type Status = 'connecting' | 'waiting' | 'watching' | 'ended';

export function LiveViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (state === ConnectionState.Connected) setStatus('waiting');
      if (state === ConnectionState.Disconnected) setStatus('ended');
    });

    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _pub: unknown, _participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
          setStatus('watching');
        }
        if (track.kind === Track.Kind.Audio && videoRef.current) {
          track.attach(videoRef.current);
        }
      }
    );

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setStatus('waiting');
      }
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      // Si el broadcaster se desconecta y no quedan publishers
      const hasPublisher = Array.from(room.remoteParticipants.values()).some(
        p => p.trackPublications.size > 0
      );
      if (!hasPublisher) setStatus('waiting');
    });

    async function connect() {
      try {
        const res = await fetch('/api/livekit/token?role=viewer');
        const { token, url } = await res.json();
        await room.connect(url, token);
      } catch {
        setStatus('ended');
      }
    }

    connect();

    return () => {
      room.disconnect();
    };
  }, []);

  return (
    <div>
      {/* Título */}
      <div className="flex items-center gap-3 mb-4">
        {status === 'watching' && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-red-600">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            EN VIVO
          </span>
        )}
        {status === 'waiting' && (
          <span className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
            Esperando que comience la transmisión...
          </span>
        )}
      </div>

      {/* Player */}
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-black"
        style={{ aspectRatio: '16/9' }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          style={{ display: status === 'watching' ? 'block' : 'none' }}
        />

        {status !== 'watching' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {status === 'connecting' && (
              <>
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white/60 text-sm">Conectando...</p>
              </>
            )}
            {status === 'waiting' && (
              <>
                <span className="text-5xl">📡</span>
                <p className="text-white/60 text-sm text-center max-w-xs">
                  La transmisión comenzará pronto.<br />La página se actualizará automáticamente.
                </p>
              </>
            )}
            {status === 'ended' && (
              <>
                <span className="text-5xl">📴</span>
                <p className="text-white/60 text-sm">La transmisión ha finalizado</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
