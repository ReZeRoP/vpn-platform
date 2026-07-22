import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ChatEvents,
  DeleteDto,
  JoinDto,
  ReadDto,
  SendMessageDto,
  TypingDto,
} from '@app/shared';
import { verifySocketAuth, SocketAuthUser } from '../common/socket-auth';
import { ChatService } from './chat.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: SocketAuthUser;
    conversations?: Set<string>;
  };
};

@WebSocketGateway({
  path: '/socket.io',
  cors: { origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly online = new Map<string, Map<string, Set<string>>>();

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const user = await verifySocketAuth(client.handshake.auth, this.jwt, this.config);
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    client.data.conversations = new Set();
    await client.join(`user:${user.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return;
    for (const conversationId of client.data.conversations ?? []) {
      this.removePresence(conversationId, user.id, client.id);
    }
  }

  @SubscribeMessage(ChatEvents.JOIN)
  async join(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() dto: JoinDto) {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'احراز هویت نشده‌اید' };
    if (!dto?.conversationId || !(await this.chat.accessOk(dto.conversationId, user.id, user.role))) {
      return { ok: false, error: 'دسترسی به این گفتگو ندارید' };
    }

    await this.chat.ensureParticipant(dto.conversationId, user.id);
    await client.join(this.room(dto.conversationId));
    client.data.conversations?.add(dto.conversationId);
    this.addPresence(dto.conversationId, user.id, client.id);
    return { ok: true };
  }

  @SubscribeMessage(ChatEvents.SEND)
  async send(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const user = client.data.user;
    if (!user) return { error: 'احراز هویت نشده‌اید' };
    const message = await this.chat.sendMessage(user.id, user.role, dto);
    client.to(this.room(dto.conversationId)).emit(ChatEvents.MESSAGE, message);
    return message;
  }

  @SubscribeMessage(ChatEvents.TYPING)
  typing(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() dto: TypingDto) {
    const user = client.data.user;
    if (!user) return;
    client.to(this.room(dto.conversationId)).emit(ChatEvents.TYPING_STATE, {
      conversationId: dto.conversationId,
      userId: user.id,
      username: user.username,
      isTyping: !!dto.isTyping,
    });
  }

  @SubscribeMessage(ChatEvents.READ)
  async read(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() dto: ReadDto) {
    const user = client.data.user;
    if (!user) return { ok: false };
    await this.chat.markRead(user.id, dto.conversationId, dto.messageId);
    client.to(this.room(dto.conversationId)).emit(ChatEvents.READ_STATE, {
      conversationId: dto.conversationId,
      userId: user.id,
      messageId: dto.messageId,
    });
    return { ok: true };
  }

  @SubscribeMessage(ChatEvents.DELETE)
  async remove(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() dto: DeleteDto) {
    const user = client.data.user;
    if (!user) return { error: 'احراز هویت نشده‌اید' };
    const deleted = await this.chat.deleteMessage(user.id, user.role, dto.messageId);
    this.server.to(this.room(deleted.conversationId)).emit(ChatEvents.DELETED, deleted);
    return deleted;
  }

  private room(conversationId: string) {
    return `conv:${conversationId}`;
  }

  private addPresence(conversationId: string, userId: string, socketId: string) {
    const users = this.online.get(conversationId) ?? new Map<string, Set<string>>();
    const sockets = users.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    users.set(userId, sockets);
    this.online.set(conversationId, users);
    this.emitPresence(conversationId);
  }

  private removePresence(conversationId: string, userId: string, socketId: string) {
    const users = this.online.get(conversationId);
    const sockets = users?.get(userId);
    if (!users || !sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) users.delete(userId);
    if (users.size === 0) this.online.delete(conversationId);
    this.emitPresence(conversationId);
  }

  private emitPresence(conversationId: string) {
    this.server.to(this.room(conversationId)).emit(ChatEvents.PRESENCE, {
      conversationId,
      userIds: [...(this.online.get(conversationId)?.keys() ?? [])],
    });
  }
}
