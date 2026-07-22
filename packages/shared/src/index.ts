// Shared contracts between web + api. Kept framework-free.

// ============================================================
//  AUTH
// ============================================================
export type Role = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  avatarUrl: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse extends AuthUser {
  walletBalance: number;
  referralCode: string | null;
}

// ============================================================
//  STORE
// ============================================================
export interface Plan {
  id: string;
  title: string;
  description: string | null;
  durationDays: number;
  dataLimitGb: number | null;
  price: number;
  isActive: boolean;
  lowStockThreshold: number;
  sortOrder: number;
  stock?: number; // public list attaches available stock
  sold?: number; // admin list
  lowStock?: boolean; // admin list
}

export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'EXPIRED';
export type PaymentMethod = 'RECEIPT' | 'WALLET';
export type ConfigType =
  | 'VLESS'
  | 'VMESS'
  | 'WIREGUARD'
  | 'TROJAN'
  | 'SHADOWSOCKS'
  | 'SUBSCRIPTION';

export interface DeliveredConfig {
  configString: string;
  configType: ConfigType;
}

export interface Order {
  id: string;
  userId: string;
  planId: string;
  status: OrderStatus;
  amount: number;
  discount: number;
  paymentMethod: PaymentMethod;
  receiptUrl: string | null;
  transactionId: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  plan?: { title: string; durationDays: number };
  fulfilledConfig?: DeliveredConfig | null;
  user?: { username: string }; // admin list
}

// ============================================================
//  WALLET
// ============================================================
export type WalletTxnType =
  | 'TOPUP'
  | 'PURCHASE'
  | 'REFUND'
  | 'REFERRAL_BONUS'
  | 'ADMIN_ADJUST';

export interface WalletTransaction {
  id: string;
  type: WalletTxnType;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  createdAt: string;
}

// ============================================================
//  NOTIFICATIONS
// ============================================================
export type NotificationType =
  | 'ORDER_APPROVED'
  | 'ORDER_REJECTED'
  | 'CONFIG_DELIVERED'
  | 'CONFIG_EXPIRING'
  | 'WALLET_TOPUP'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
//  CHAT
// ============================================================
export type ConvType = 'GLOBAL' | 'DM' | 'SUPPORT';
export type MessageType = 'TEXT' | 'IMAGE' | 'STICKER' | 'GIF' | 'SYSTEM';

export interface ChatUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ConversationView {
  id: string;
  type: ConvType;
  title: string | null;
  unreadCount: number;
  lastMessage?: MessagePayload | null;
  updatedAt: string;
}

export interface MessagePayload {
  id: string;
  conversationId: string;
  sender: ChatUser;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  replyToId: string | null;
  isDeleted: boolean;
  createdAt: string;
  editedAt: string | null;
}

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
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  replyToId?: string;
}

export interface JoinDto {
  conversationId: string;
}

export interface TypingDto {
  conversationId: string;
  isTyping: boolean;
}

export interface ReadDto {
  conversationId: string;
  messageId: string;
}

export interface DeleteDto {
  messageId: string;
}

export interface PresencePayload {
  conversationId: string;
  userIds: string[];
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';
