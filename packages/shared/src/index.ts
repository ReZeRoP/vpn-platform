// Shared contracts between web + api. Kept framework-free.

// ---- Socket.IO event names (single source of truth) ----
export const ChatEvents = {
  // client -> server
  JOIN: 'chat:join',
  SEND: 'chat:send',
  TYPING: 'chat:typing',
  READ: 'chat:read',
  DELETE: 'chat:delete',
  // server -> client
  MESSAGE: 'chat:message',
  TYPING_STATE: 'chat:typing_state',
  READ_STATE: 'chat:read_state',
  DELETED: 'chat:deleted',
  PRESENCE: 'chat:presence',
} as const;

// ---- Wire DTOs ----
export interface SendMessageDto {
  conversationId: string;
  type: 'TEXT' | 'IMAGE' | 'STICKER' | 'GIF';
  content?: string;
  mediaUrl?: string;
  replyToId?: string;
}

export interface MessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  replyToId?: string | null;
  createdAt: string;
  isDeleted: boolean;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
