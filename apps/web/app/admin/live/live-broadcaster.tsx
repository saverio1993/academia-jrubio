'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  LocalAudioTrack,
  AudioPresets,
  VideoPresets,
  createLocalAudioTrack,
  type RemoteParticipant,
} from 'livekit-client';

interface ChatMsg { id: string; name: string; text: string; ts: number; broadcaster?: boolean }
const enc = new TextEncoder();
const dec = new TextDecoder();

type Status   = 'idle' | 'live' | 'error';
type SrcMode  = 'camera' | 'screen' | 'both' | 'obs';
type Resolution = '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p';

const RES = {
  '2160p': { w: 3840, h: 2160, fps: 30, bitrate: 60_000_000 },
  '1440p': { w: 2560, h: 1440, fps: 30, bitrate: 35_000_000 },
  '1080p': { w: 1920, h: 1080, fps: 30, bitrate: 20_000_000 },
  '720p':  { w: 1280, h: 720,  fps: 30, bitrate: 10_000_000 },
  '480p':  { w: 854,  h: 480,  fps: 30, bitrate: 4_000_000  },
  '360p':  { w: 640,  h: 360,  fps: 30, bitrate: 2_000_000  },
};

export function LiveBroadcaster() {
  /* preview visible al usuario */
  const previewRef    = useRef<HTMLVideoElement>(null);
  /* videos ocultos para el composite */
  const screenVidRef  = useRef<HTMLVideoElement>(null);
  const camVidRef     = useRef<HTMLVideoElement>(null);
  /* canvas para mezcla */
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number | null>(null);

  const roomRef       = useRef<Room | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const micRef        = useRef<LocalAudioTrack | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const chatEndRef    = useRef<HTMLDivElement>(null);

  const [status,     setStatus]     = useState<Status>('idle');
  const [srcMode,    setSrcMode]    = useState<SrcMode>('camera');
  const [audioSrc,   setAudioSrc]   = useState<'mic' | 'mix'>('mic');
  const [resolution, setResolution] = useState<Resolution>('1440p');
  const [title,      setTitle]      = useState('');
  const [description,setDescription]= useState('');
  const [viewers,    setViewers]    = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [micOn,      setMicOn]      = useState(true);
  const [error,      setError]      = useState('');
  const [msgs,       setMsgs]       = useState<ChatMsg[]>([]);
  const [chatInput,  setChatInput]  = useState('');
  const [showGpu,    setShowGpu]    = useState(false);
  const [trackInfo,  setTrackInfo]  = useState<string>('');
  const [obsCreds,   setObsCreds]   = useState<{ rtmpUrl: string; streamKey: string } | null>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  /* ── Canvas composite: pantalla + cámara PiP ── */
  function startComposite(dims: { w: number; h: number; fps: number }) {
    const canvas = canvasRef.current;
    const scVid  = screenVidRef.current;
    const camVid = camVidRef.current;
    if (!canvas || !scVid) return;

    const { w, h, fps } = dims;
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    // Sin suavizado — más rápido para video
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';

    const interval = 1000 / fps;
    let lastFrame  = 0;

    // Coordenadas PiP precalculadas (evita recalcular cada frame)
    const pw = Math.round(w * 0.26);
    const ph = Math.round(pw * 9 / 16);
    const px = w - pw - 16;
    const py = h - ph - 16;
    const r  = 6;

    function pipPath() {
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.lineTo(px + pw - r, py);
      ctx.arcTo(px + pw, py, px + pw, py + r, r);
      ctx.lineTo(px + pw, py + ph - r);
      ctx.arcTo(px + pw, py + ph, px + pw - r, py + ph, r);
      ctx.lineTo(px + r, py + ph);
      ctx.arcTo(px, py + ph, px, py + ph - r, r);
      ctx.lineTo(px, py + r);
      ctx.arcTo(px, py, px + r, py, r);
      ctx.closePath();
    }

    function draw(timestamp: number) {
      // Throttle real al fps objetivo (evita trabajo doble en pantallas de 60/120Hz)
      if (timestamp - lastFrame < interval) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const sv = scVid!;
      if (sv.readyState >= 2) {
        ctx.drawImage(sv, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
      }

      // Cámara PiP (esquina inferior derecha) — sin shadowBlur (muy costoso)
      if (camVid && camVid.readyState >= 2) {
        ctx.save();
        pipPath();
        ctx.clip();
        ctx.drawImage(camVid, px, py, pw, ph);
        ctx.restore();

        // Borde delgado sin sombra
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth   = 2;
        pipPath();
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    // Devolver el track del canvas
    const stream = canvas.captureStream(fps);
    return stream.getVideoTracks()[0];
  }

  /* ── Iniciar live ── */
  async function startLive() {
    if (!title.trim()) { setError('Escribe un título'); return; }
    setError('');

    try {
      await fetch('/api/livekit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      /* ── Modo OBS: solo crear el ingress RTMP, no capturar cámara ── */
      if (srcMode === 'obs') {
        const data = await fetch('/api/livekit/ingress', { method: 'POST' }).then(r => r.json());
        if (data.error) throw new Error(data.error);
        setObsCreds({ rtmpUrl: data.rtmpUrl, streamKey: data.streamKey });
        setStatus('live');
        setDuration(0);
        return;
      }

      const { token, url } = await fetch('/api/livekit/token?role=broadcaster').then(r => r.json());
      const res = RES[resolution];
      let rawVideoTrack: MediaStreamTrack;

      // ── Captura de pantalla con o sin audio del escritorio ──
      let desktopAudioRaw: MediaStreamTrack | null = null;
      const wantDesktopAudio = audioSrc === 'mix' && (srcMode === 'screen' || srcMode === 'both');

      if (srcMode === 'camera') {
        /* ── Solo cámara: pedir el máximo que la cámara soporte ── */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width:     { ideal: 3840, min: 640 },   // 4K → 1080p → 720p según la cámara
            height:    { ideal: 2160, min: 480 },
            frameRate: { ideal: res.fps, max: res.fps },
          },
        });
        const camTrack = stream.getVideoTracks()[0];
        if (!camTrack) throw new Error('No se encontró cámara');
        rawVideoTrack = camTrack;
        if (previewRef.current) { previewRef.current.srcObject = stream; }

      } else if (srcMode === 'screen') {
        /* ── Pantalla: resolución nativa del monitor ── */
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: res.fps, max: res.fps } }, // sin limitar ancho/alto → resolución nativa
          audio: wantDesktopAudio,
        });
        const screenTrack = stream.getVideoTracks()[0];
        if (!screenTrack) throw new Error('No se encontró pantalla');
        rawVideoTrack = screenTrack;
        desktopAudioRaw = stream.getAudioTracks()[0] ?? null;
        if (previewRef.current) { previewRef.current.srcObject = new MediaStream([screenTrack]); }
        rawVideoTrack.addEventListener('ended', () => stopLive());

      } else {
        /* ── Pantalla + Cámara (canvas composite) ── */
        const [screenStream, camStream] = await Promise.all([
          navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: res.fps, max: res.fps } },
            audio: wantDesktopAudio,
          }),
          navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920, min: 320 }, height: { ideal: 1080, min: 240 }, frameRate: { ideal: 30 } },
          }).catch(() => null),
        ]);

        desktopAudioRaw = screenStream.getAudioTracks()[0] ?? null;

        if (screenVidRef.current) {
          screenVidRef.current.srcObject = screenStream;
          await screenVidRef.current.play().catch(() => null);
        }
        if (camStream && camVidRef.current) {
          camVidRef.current.srcObject = camStream;
          await camVidRef.current.play().catch(() => null);
        }

        // Usar la resolución real del screen share (no el preset)
        const scrSettings = screenStream.getVideoTracks()[0]?.getSettings() ?? {};
        const compDims = {
          w:   scrSettings.width  ?? res.w,
          h:   scrSettings.height ?? res.h,
          fps: res.fps,
        };
        const compositeTrack = startComposite(compDims);
        if (!compositeTrack) throw new Error('Canvas no disponible');
        rawVideoTrack = compositeTrack;
        if (previewRef.current && canvasRef.current) {
          previewRef.current.srcObject = canvasRef.current.captureStream(res.fps);
        }

        screenStream.getVideoTracks()[0]?.addEventListener('ended', () => stopLive());
      }

      // Mostrar resolución real capturada
      const settings = rawVideoTrack.getSettings();
      setTrackInfo(`${settings.width ?? '?'}×${settings.height ?? '?'} @ ${settings.frameRate?.toFixed(0) ?? '?'}fps`);

      // Hint al encoder
      (rawVideoTrack as MediaStreamTrack & { contentHint: string }).contentHint =
        srcMode === 'screen' ? 'detail' : 'motion';

      const lkVideoTrack = new LocalVideoTrack(rawVideoTrack, undefined, true);
      videoTrackRef.current = lkVideoTrack;

      // ── Audio: micrófono solo o mezcla con escritorio ──
      const micRaw = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const micRawTrack = micRaw.getAudioTracks()[0];
      if (!micRawTrack) throw new Error('No se encontró micrófono');

      let audioTrack: LocalAudioTrack;

      if (desktopAudioRaw) {
        // Mezclar micrófono + audio escritorio con Web Audio API
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const micNode  = ctx.createMediaStreamSource(new MediaStream([micRawTrack]));
        const deskNode = ctx.createMediaStreamSource(new MediaStream([desktopAudioRaw]));
        const dest     = ctx.createMediaStreamDestination();
        // Ganancia individual para no saturar
        const micGain  = ctx.createGain(); micGain.gain.value  = 1.0;
        const deskGain = ctx.createGain(); deskGain.gain.value = 0.85;
        micNode.connect(micGain);   micGain.connect(dest);
        deskNode.connect(deskGain); deskGain.connect(dest);
        const mixedRaw = dest.stream.getAudioTracks()[0];
        if (!mixedRaw) throw new Error('Error al mezclar audio');
        audioTrack = new LocalAudioTrack(mixedRaw);
      } else {
        audioTrack = new LocalAudioTrack(micRawTrack);
      }
      micRef.current = audioTrack;

      // Conectar y publicar
      const room = new Room({ dynacast: false });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected,    () => setViewers(v => v + 1));
      room.on(RoomEvent.ParticipantDisconnected, () => setViewers(v => Math.max(0, v - 1)));
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(dec.decode(payload));
          if (msg.type === 'chat') setMsgs(p => [...p.slice(-199), { id: crypto.randomUUID(), name: msg.name, text: msg.text, ts: msg.ts }]);
        } catch {}
      });

      await room.connect(url, token);
      // Simulcast con 3 capas: la fuente capturada a máxima calidad + 1080p + 720p
      // adaptiveStream:false en el viewer asegura que siempre reciba la capa HIGH
      await room.localParticipant.publishTrack(lkVideoTrack, {
        simulcast: true,
        videoCodec: 'h264',
        videoEncoding: { maxBitrate: res.bitrate, maxFramerate: res.fps, priority: 'high' },
        videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h720],
      });
      await room.localParticipant.publishTrack(audioTrack, {
        audioPreset: AudioPresets.musicHighQuality,
      });

      setViewers(room.remoteParticipants.size);
      setStatus('live');
      setDuration(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar');
      setStatus('error');
    }
  }

  /* ── Detener live ── */
  async function stopLive() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    audioCtxRef.current?.close(); audioCtxRef.current = null;
    videoTrackRef.current?.mediaStreamTrack.stop();
    micRef.current?.mediaStreamTrack.stop();
    setTrackInfo('');

    if (screenVidRef.current?.srcObject) {
      (screenVidRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      screenVidRef.current.srcObject = null;
    }
    if (camVidRef.current?.srcObject) {
      (camVidRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      camVidRef.current.srcObject = null;
    }
    if (previewRef.current) previewRef.current.srcObject = null;

    roomRef.current?.disconnect();
    roomRef.current = null;

    await fetch('/api/livekit/stop', { method: 'POST' }).catch(() => null);
    setObsCreds(null);
    setStatus('idle');
    setViewers(0);
    setDuration(0);
  }

  async function toggleMic() {
    const mic = micRef.current; if (!mic) return;
    if (micOn) { await mic.mute(); setMicOn(false); }
    else { await mic.unmute(); setMicOn(true); }
  }

  async function sendChat() {
    const text = chatInput.trim(); if (!text || !roomRef.current) return;
    const payload = enc.encode(JSON.stringify({ type: 'chat', name: 'Admin 🎙', text, ts: Date.now(), broadcaster: true }));
    await roomRef.current.localParticipant.publishData(payload, { reliable: true });
    setMsgs(p => [...p.slice(-199), { id: crypto.randomUUID(), name: 'Admin 🎙', text, ts: Date.now(), broadcaster: true }]);
    setChatInput('');
  }

  useEffect(() => () => { stopLive(); }, []);

  return (
    <div className="space-y-5">
      {/* Videos ocultos para composite */}
      <video ref={screenVidRef} autoPlay muted playsInline style={{ display: 'none' }} />
      <video ref={camVidRef}    autoPlay muted playsInline style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Preview */}
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-black mx-auto"
           style={{ aspectRatio: '16/9' }}>
        <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-contain" />

        {status !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/30 text-sm">Vista previa</p>
          </div>
        )}

        {status === 'live' && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white bg-red-600">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> EN VIVO
              </span>
              <span className="rounded-full px-2 py-1 text-xs text-white bg-black/50 font-mono">
                {formatTime(duration)}
              </span>
              {trackInfo && (
                <span className="rounded-full px-2 py-1 text-xs text-white bg-black/50 font-mono">
                  {trackInfo}
                </span>
              )}
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-medium text-white bg-black/50">
              {viewers} {viewers === 1 ? 'espectador' : 'espectadores'}
            </span>
          </div>
        )}
      </div>

      {/* Controles durante el live */}
      {status === 'live' && (
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          {/* Micrófono — solo en modos no-OBS */}
          {srcMode !== 'obs' && (
            <button onClick={toggleMic}
              className={`flex flex-col items-center gap-1 rounded-2xl px-5 py-3 text-xs font-medium border transition-all ${
                micOn ? 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                      : 'bg-red-600/20 border-red-500/50 text-red-400'
              }`}>
              {micOn
                ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
                : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
              }
              {micOn ? 'Micro' : 'Silenciado'}
            </button>
          )}

          {/* Terminar */}
          <button onClick={stopLive}
            className="flex flex-col items-center gap-1 rounded-2xl px-5 py-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
            Terminar
          </button>
        </div>
      )}

      {/* Panel de credenciales OBS */}
      {status === 'live' && srcMode === 'obs' && obsCreds && (
        <div className="max-w-2xl mx-auto rounded-2xl border overflow-hidden space-y-0"
             style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-bold">🎬 Credenciales RTMP para OBS</span>
          </div>
          <div className="px-4 py-4 space-y-3">
            {/* URL del servidor */}
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Servidor (Server URL)</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-lg px-3 py-2 text-xs font-mono truncate"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  {obsCreds.rtmpUrl}
                </code>
                <button onClick={() => navigator.clipboard.writeText(obsCreds.rtmpUrl)}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium border hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                  Copiar
                </button>
              </div>
            </div>
            {/* Clave de stream */}
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted)' }}>Clave de stream (Stream Key)</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-lg px-3 py-2 text-xs font-mono truncate"
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  {obsCreds.streamKey}
                </code>
                <button onClick={() => navigator.clipboard.writeText(obsCreds.streamKey)}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium border hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
                  Copiar
                </button>
              </div>
            </div>
            {/* Guía */}
            <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <p className="font-bold mb-1">En OBS Studio:</p>
              <ol className="space-y-0.5" style={{ color: 'var(--color-muted)' }}>
                <li>1. Archivo → Configuración → Retransmisión</li>
                <li>2. Servicio: <strong>Personalizado</strong></li>
                <li>3. Servidor: pega la URL de arriba</li>
                <li>4. Clave de retransmisión: pega la clave de arriba</li>
                <li>5. Aplica → Iniciar transmisión en OBS</li>
              </ol>
              <p className="mt-2 text-yellow-500">Los viewers verán el stream en cuanto OBS empiece a transmitir.</p>
            </div>
          </div>
        </div>
      )}

      {/* Chat durante el live (solo modos no-OBS donde el broadcaster está conectado) */}
      {status === 'live' && srcMode !== 'obs' && (
        <div className="max-w-2xl mx-auto rounded-2xl border overflow-hidden"
             style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-bold">💬 Chat en vivo</span>
            {msgs.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>{msgs.length}</span>}
          </div>
          <div className="h-44 overflow-y-auto px-4 py-3 space-y-2 flex flex-col">
            {msgs.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Los mensajes aparecerán aquí</p>
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} className="flex gap-2 text-sm">
                <span className={`font-bold shrink-0 ${m.broadcaster ? 'text-[var(--color-accent)]' : ''}`}>{m.name}:</span>
                <span>{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Responder..." maxLength={200}
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } }} />
            <button onClick={sendChat} disabled={!chatInput.trim()}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-40 hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}>
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de inicio */}
      {status !== 'live' && (
        <div className="max-w-md mx-auto space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Desbloqueo Xiaomi Redmi Note 13"
              className="w-full rounded-xl border px-4 py-2.5 text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="¿Qué vas a hacer en este live?"
              className="w-full rounded-xl border px-4 py-2.5 text-sm resize-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-input)' }} />
          </div>

          {/* Fuente de video */}
          <div>
            <label className="block text-sm font-medium mb-2">Fuente de video</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'camera', icon: '📷', label: 'Solo cámara' },
                { id: 'screen', icon: '🖥', label: 'Solo pantalla' },
                { id: 'both',   icon: '🎥', label: 'Pantalla + cámara' },
                { id: 'obs',    icon: '🎬', label: 'OBS / Software externo' },
              ] as { id: SrcMode; icon: string; label: string }[]).map(opt => (
                <button key={opt.id} onClick={() => setSrcMode(opt.id)}
                  className={`flex items-center gap-2 rounded-xl py-2.5 px-3 text-xs font-medium border transition-all ${
                    srcMode === opt.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50'
                  }`}>
                  <span className="text-lg shrink-0">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted)' }}>
              {srcMode === 'camera' && 'Transmite tu cámara web.'}
              {srcMode === 'screen' && 'Comparte la pantalla de tu PC. No necesitas cámara.'}
              {srcMode === 'both'   && 'Pantalla completa con tu cámara en la esquina inferior derecha.'}
              {srcMode === 'obs'    && 'La web te da la URL y clave RTMP. Las pegas en OBS y él envía el stream.'}
            </p>
          </div>

          {/* Fuente de audio — oculto en modo OBS (lo gestiona OBS) */}
          {srcMode !== 'obs' && (
            <div>
              <label className="block text-sm font-medium mb-2">Fuente de audio</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'mic', icon: '🎤', label: 'Solo micrófono',          desc: 'Solo tu voz' },
                  { id: 'mix', icon: '🔊', label: 'Micro + audio escritorio', desc: srcMode === 'camera' ? 'No disponible en modo cámara' : 'Marca "Compartir audio" en el diálogo del navegador' },
                ] as { id: 'mic'|'mix'; icon: string; label: string; desc: string }[]).map(opt => {
                  const disabled = opt.id === 'mix' && srcMode === 'camera';
                  return (
                    <button key={opt.id}
                      onClick={() => !disabled && setAudioSrc(opt.id)}
                      disabled={disabled}
                      className={`flex flex-col items-start gap-1 rounded-xl py-3 px-3 text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        audioSrc === opt.id && !disabled
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50'
                      }`}>
                      <span className="text-lg">{opt.icon} <span className="font-bold">{opt.label}</span></span>
                      <span className="text-[10px] leading-tight">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calidad de envío — oculto en modo OBS (lo controla OBS) */}
          {srcMode !== 'obs' && (
            <div>
              <label className="block text-sm font-medium mb-1">Calidad de envío</label>
              <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
                La captura usa la resolución máxima disponible. Este ajuste controla el bitrate enviado.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: '360p',  label: '360p',  sub: '2 Mbps'  },
                  { id: '480p',  label: '480p',  sub: '4 Mbps'  },
                  { id: '720p',  label: '720p',  sub: '10 Mbps' },
                  { id: '1080p', label: '1080p', sub: '20 Mbps' },
                  { id: '1440p', label: '2K',    sub: '35 Mbps' },
                  { id: '2160p', label: '4K',    sub: '60 Mbps' },
                ] as { id: Resolution; label: string; sub: string }[]).map(r => (
                  <button key={r.id} onClick={() => setResolution(r.id)}
                    className={`flex flex-col items-center rounded-xl py-2 px-1 text-xs font-bold border transition-all ${
                      resolution === r.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50'
                    }`}>
                    <span>{r.label}</span>
                    <span className="font-normal opacity-70">{r.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Panel GPU — solo relevante fuera de OBS */}
          {srcMode !== 'obs' && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={() => setShowGpu(g => !g)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-card)' }}>
                <span className="flex items-center gap-2"><span>⚡</span><span>Forzar GPU dedicada (reduce lag)</span></span>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{showGpu ? '▲' : '▼'}</span>
              </button>
              {showGpu && (
                <div className="px-4 pb-4 pt-1 space-y-4 text-sm" style={{ background: 'var(--color-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Para forzar tu GPU NVIDIA/AMD dedicada:</p>
                  <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <p className="font-bold text-xs uppercase" style={{ color: 'var(--color-accent)' }}>Windows 11/10</p>
                    <ol className="space-y-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                      <li>1. Click derecho escritorio → <strong>Configuración de pantalla → Gráficos</strong></li>
                      <li>2. Añade <code>chrome.exe</code> → Opciones → <strong>Alto rendimiento</strong></li>
                      <li>3. Guarda y reinicia el navegador</li>
                    </ol>
                  </div>
                  <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <p className="font-bold text-xs uppercase text-green-500">Panel NVIDIA</p>
                    <ol className="space-y-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                      <li>1. <strong>Administrar configuración 3D → Configuración de programa</strong></li>
                      <li>2. Añade <code>chrome.exe</code> → <strong>Procesador NVIDIA de alto rendimiento</strong></li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nota OBS: no preview, controles en OBS */}
          {srcMode === 'obs' && (
            <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="font-bold text-sm mb-2">🎬 Modo OBS</p>
              <p style={{ color: 'var(--color-muted)' }}>Al iniciar recibirás la URL RTMP y la clave de stream para pegar en OBS Studio, Streamlabs u otro software.</p>
              <p style={{ color: 'var(--color-muted)' }}>La resolución, bitrate y fps los controlas directamente en OBS.</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={startLive}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{ background: '#ef4444' }}>
            {srcMode === 'obs' ? 'Obtener credenciales RTMP' : 'Iniciar transmisión'}
          </button>
        </div>
      )}
    </div>
  );
}
