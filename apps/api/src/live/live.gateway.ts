import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { prisma } from '@academia/db';

async function notifyTelegram(title: string, appUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID ?? process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  const text = `📡 <b>¡Live iniciado!</b>\n\n<b>${title}</b>\n\nMira la transmisión en: ${appUrl}/live`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => null);
}

@WebSocketGateway({ namespace: '/live', cors: { origin: '*' } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private broadcasterSocketId: string | null = null;

  handleConnection(client: Socket) {
    console.log('[live] conectado:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('[live] desconectado:', client.id);
    if (client.id === this.broadcasterSocketId) {
      this.broadcasterSocketId = null;
      this.server.emit('live-ended');
      prisma.liveSession.updateMany({
        where: { isLive: true },
        data: { isLive: false, endedAt: new Date() },
      }).catch(() => null);
    }
  }

  // Admin inicia el live
  @SubscribeMessage('broadcaster-ready')
  async onBroadcasterReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { title: string; description?: string },
  ) {
    this.broadcasterSocketId = client.id;
    client.join('broadcaster');

    await prisma.liveSession.updateMany({ where: { isLive: true }, data: { isLive: false, endedAt: new Date() } });
    await prisma.liveSession.create({
      data: { title: data.title, description: data.description ?? '', isLive: true },
    });

    // Notificar a todos los viewers que hay live
    client.broadcast.emit('live-started', { title: data.title });

    const appUrl = process.env.APP_URL ?? 'https://academia-jrubio-web-nnl3.vercel.app';
    notifyTelegram(data.title, appUrl).catch(() => null);

    return { ok: true };
  }

  // Admin termina el live
  @SubscribeMessage('broadcaster-stop')
  async onBroadcasterStop(@ConnectedSocket() client: Socket) {
    this.broadcasterSocketId = null;
    await prisma.liveSession.updateMany({ where: { isLive: true }, data: { isLive: false, endedAt: new Date() } });
    this.server.emit('live-ended');
    return { ok: true };
  }

  // Viewer pide unirse — notifica al broadcaster para iniciar WebRTC
  @SubscribeMessage('viewer-join')
  onViewerJoin(@ConnectedSocket() client: Socket) {
    if (!this.broadcasterSocketId) {
      client.emit('no-live');
      return;
    }
    // Dile al broadcaster que un viewer nuevo quiere conectarse
    this.server.to(this.broadcasterSocketId).emit('new-viewer', { viewerId: client.id });
  }

  // Broadcaster envía oferta WebRTC a un viewer específico
  @SubscribeMessage('webrtc-offer')
  onOffer(@MessageBody() data: { viewerId: string; offer: unknown }) {
    this.server.to(data.viewerId).emit('webrtc-offer', { offer: data.offer });
  }

  // Viewer envía respuesta WebRTC al broadcaster
  @SubscribeMessage('webrtc-answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { answer: unknown },
  ) {
    if (this.broadcasterSocketId) {
      this.server.to(this.broadcasterSocketId).emit('webrtc-answer', {
        viewerId: client.id,
        answer: data.answer,
      });
    }
  }

  // Intercambio de ICE candidates
  @SubscribeMessage('ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetId: string; candidate: unknown },
  ) {
    this.server.to(data.targetId).emit('ice-candidate', {
      fromId: client.id,
      candidate: data.candidate,
    });
  }
}
