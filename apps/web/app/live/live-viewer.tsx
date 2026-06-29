'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Props {
  apiUrl: string;
}

export function LiveViewer({ apiUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'watching' | 'ended' | 'no-live'>('connecting');

  useEffect(() => {
    const socket = io(`${apiUrl}/live`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('viewer-join');
    });

    socket.on('no-live', () => setStatus('no-live'));
    socket.on('live-ended', () => {
      setStatus('ended');
      pcRef.current?.close();
    });

    // El broadcaster envía la oferta WebRTC
    socket.on('webrtc-offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('watching');
        }
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit('ice-candidate', { targetId: 'broadcaster', candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { answer });
    });

    // ICE candidates del broadcaster
    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    return () => {
      pcRef.current?.close();
      socket.disconnect();
    };
  }, [apiUrl]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black"
         style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {status !== 'watching' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {status === 'connecting' && (
            <>
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-sm text-white/70">Conectando...</p>
            </>
          )}
          {status === 'ended' && (
            <>
              <div className="text-4xl">📴</div>
              <p className="text-white/70 text-sm">La transmisión ha finalizado</p>
            </>
          )}
          {status === 'no-live' && (
            <>
              <div className="text-4xl">📡</div>
              <p className="text-white/70 text-sm">No hay transmisión activa en este momento</p>
            </>
          )}
        </div>
      )}

      {status === 'watching' && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1
                        text-xs font-bold text-white bg-red-600">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          EN VIVO
        </div>
      )}
    </div>
  );
}
