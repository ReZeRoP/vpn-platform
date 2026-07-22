import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MessagePayload,
  ConversationView,
  ChatUser,
  SendMessageDto,
  MessageType,
} from '@app/shared';
import { Prisma } from '@app/db';

const PAGE_SIZE = 50;

function toChatUser(u: { id: string; username: string; avatarUrl: string | null }): ChatUser {
  return { id: u.id, username: u.username, avatarUrl: u.avatarUrl };
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ---------------- conversations ----------------
  async ensureGlobal() {
    return this.prisma.conversation.upsert({
      where: { id: 'global-chat' },
      update: {},
      create: { id: 'global-chat', type: 'GLOBAL', title: 'چت عمومی' },
    });
  }

  async ensureParticipant(conversationId: string, userId: string) {
    await this.prisma.conversationParticipant
      .upsert({
        where: { conversationId_userId: { conversationId, userId } },
        update: {},
        create: { conversationId, userId },
      })
      .catch(() => undefined);
  }

  async listConversations(userId: string, role: 'USER' | 'ADMIN') {
    const global = await this.ensureGlobal();
    await this.ensureParticipant(global.id, userId);

    const supportWhere = role === 'ADMIN' ? { type: 'SUPPORT' as const } : undefined;
    const support = supportWhere
      ? await this.prisma.conversation.findMany({ where: supportWhere, orderBy: { updatedAt: 'desc' } })
      : await this.prisma.conversation.findMany({
          where: {
            type: 'SUPPORT',
            participants: { some: { userId } },
          },
          orderBy: { updatedAt: 'desc' },
        });

    const conversations = [global, ...support];
    return Promise.all(conversations.map((c) => this.toConversationView(c, userId)));
  }

  private async toConversationView(c: { id: string; type: string; title: string | null; updatedAt: Date }, userId: string): Promise<ConversationView> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: c.id, userId } },
    });

    let unread = 0;
    if (participant) {
      let since = new Date(0);
      if (participant.lastReadMessageId) {
        const lr = await this.prisma.message.findUnique({
          where: { id: participant.lastReadMessageId },
          select: { createdAt: true },
        });
        if (lr) since = lr.createdAt;
      }
      unread = await this.prisma.message.count({ where: { conversationId: c.id, createdAt: { gt: since } } });
    }

    const last = await this.prisma.message.findFirst({
      where: { conversationId: c.id },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    return {
      id: c.id,
      type: c.type as ConversationView['type'],
      title: c.title,
      unreadCount: unread,
      lastMessage: last ? this.toMessagePayload(last) : null,
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  async getMessages(conversationId: string, userId: string, role: 'USER' | 'ADMIN', before?: { createdAt: Date; id: string }) {
    await this.assertAccess(conversationId, userId, role);

    const where: Prisma.MessageWhereInput = { conversationId };
    if (before) {
      where.OR = [
        { createdAt: { lt: before.createdAt } },
        { createdAt: { equals: before.createdAt }, id: { lt: before.id } },
      ];
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    const hasMore = messages.length > PAGE_SIZE;
    const items = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
    const nextCursor =
      hasMore && items.length > 0
        ? { createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id }
        : null;

    return {
      messages: items.reverse().map(this.toMessagePayload),
      nextCursor,
    };
  }

  async sendMessage(userId: string, role: 'USER' | 'ADMIN', dto: SendMessageDto): Promise<MessagePayload> {
    await this.assertAccess(dto.conversationId, userId, role);
    const type = (dto.type || 'TEXT') as MessageType;
    if (type === 'TEXT' && (!dto.content || !dto.content.trim())) {
      throw new BadRequestException('پیام خالی است');
    }
    if (type !== 'TEXT' && !dto.mediaUrl) {
      throw new BadRequestException('پیام تصویری نیاز به فایل دارد');
    }

    await this.ensureParticipant(dto.conversationId, userId);

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        type,
        content: dto.content ?? null,
        mediaUrl: dto.mediaUrl ?? null,
        mediaWidth: dto.mediaWidth ?? null,
        mediaHeight: dto.mediaHeight ?? null,
        replyToId: dto.replyToId ?? null,
      },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    // bump conversation.updatedAt for sidebar ordering
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return this.toMessagePayload(message);
  }

  async markRead(userId: string, conversationId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.conversationId !== conversationId) throw new NotFoundException('پیام یافت نشد');
    await this.ensureParticipant(conversationId, userId);
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadMessageId: messageId },
    });
  }

  async deleteMessage(userId: string, role: 'USER' | 'ADMIN', messageId: string): Promise<{ conversationId: string; messageId: string }> {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('پیام یافت نشد');
    if (msg.senderId !== userId && role !== 'ADMIN') throw new ForbiddenException('اجازه حذف ندارید');
    if (msg.isDeleted) return { conversationId: msg.conversationId, messageId };
    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null, mediaUrl: null },
    });
    return { conversationId: msg.conversationId, messageId };
  }

  async createSupport(userId: string, title: string) {
    const conv = await this.prisma.conversation.create({
      data: {
        type: 'SUPPORT',
        title: title?.trim() || 'پشتیبانی',
        participants: { create: { userId } },
      },
    });
    return this.toConversationView(conv, userId);
  }

  async accessOk(conversationId: string, userId: string, role: 'USER' | 'ADMIN') {
    try {
      await this.assertAccess(conversationId, userId, role);
      return true;
    } catch {
      return false;
    }
  }

  private async assertAccess(conversationId: string, userId: string, role: 'USER' | 'ADMIN') {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('گفتگو یافت نشد');
    if (conv.type === 'GLOBAL') return;
    // ADMIN can access every conversation (support/DM oversight).
    if (role === 'ADMIN') return;
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('دسترسی به این گفتگو ندارید');
  }

  private toMessagePayload(m: {
    id: string;
    conversationId: string;
    senderId: string;
    sender: { id: string; username: string; avatarUrl: string | null };
    type: string;
    content: string | null;
    mediaUrl: string | null;
    mediaWidth: number | null;
    mediaHeight: number | null;
    replyToId: string | null;
    isDeleted: boolean;
    createdAt: Date;
    editedAt: Date | null;
  }): MessagePayload {
    return {
      id: m.id,
      conversationId: m.conversationId,
      sender: toChatUser(m.sender),
      senderId: m.senderId,
      type: m.type as MessagePayload['type'],
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaWidth: m.mediaWidth,
      mediaHeight: m.mediaHeight,
      replyToId: m.replyToId,
      isDeleted: m.isDeleted,
      createdAt: m.createdAt.toISOString(),
      editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    };
  }
}
