'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Props {
  apiUrl: string;
}

type Status = 'idle' | 'live' | 'error';

export function LiveBroadcaster({ apiUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const [status, setStatus] = useState<Status>('idle');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState('');

  async function startLive() {
    if (!title.trim()) { setError('Escribe un título para el live'); return; }
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const socket = io(`${apiUrl}/live`, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('broadcaster-ready', { title: title.trim(), description: description.trim() });
        setStatus('live');
      });

      // Nuevo viewer quiere conectarse
      socket.on('new-viewer', async ({ viewerId }: { viewerId: string }) => {
        setViewers(v => v + 1);
        const pc = createPeerConnection(socket, viewerId);
        peersRef.current.set(viewerId, pc);

        // Agregar tracks del stream al peer
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { viewerId, offer });
      });

      socket.on('webrtc-answer', async ({ viewerId, answer }: { viewerId: string; answer: RTCSessionDescriptionInit }) => {
        const pc = peersRef.current.get(viewerId);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('ice-candidate', async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
        const pc = peersRef.current.get(fromId);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null);
      });

      socket.on('disconnect', () => {
        if (status === 'live') stopLive();
      });

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al acceder a la cámara');
      setStatus('error');
    }
  }

  function createPeerConnection(socket: Socket, viewerId: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('ice-candidate', { targetId: viewerId, candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        peersRef.current.delete(viewerId);
        setViewers(v => Math.max(0, v - 1));
      }
    };
    return pc;
  }

  function stopLive() {
    socketRef.current?.emit('broadcaster-stop');
    socketRef.current?.disconnect();
    socketRef.current = null;

    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setStatus('idle');
    setViewers(0);
  }

  useEffect(() => () => { stopLive(); }, []);

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-black mx-auto"
           style={{ aspectRatio: '16/9' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {status !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/40 text-sm">Vista previa de cámara</p>
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

      {/* Controls */}
      {status === 'idle' || status === 'error' ? (
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título del live *</label>
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
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#ef4444' }}
          >
            Iniciar transmisión
          </button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <p className="text-sm font-medium">{title}</p>
          <button
            onClick={stopLive}
            className="rounded-xl px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-muted)' }}
          >
            Detener transmisión
          </button>
        </div>
      )}
    </div>
  );
}
