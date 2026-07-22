'use client';

import type { ConversationView, MessagePayload, SendMessageDto } from '@app/shared';
import { ChatEvents } from '@app/shared';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { useAuth } from '@/stores/auth';
import { api, mediaUrl, upload } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { formatTime, formatDayLabel } from '@/lib/date';
import { Spinner } from '@/components/ui';

const PAGE_SIZE = 50;

export function ChatView() {
  const router = useRouter();
  const query = useSearchParams();
  const { user, hydrated } = useAuth();

  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<MessagePayload | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const cursorRef = useRef<{ createdAt: string; id: string } | null>(null);

  // Load conversations
  useEffect(() => {
    if (!hydrated || !user) return;
    api<ConversationView[]>('/conversations')
      .then(setConversations)
      .catch((e: Error) => setError(e.message));
  }, [hydrated, user]);

  // Set active conversation from URL or default to first
  useEffect(() => {
    if (conversations.length === 0) return;
    const fromUrl = query.get('conversation');
    const target = fromUrl && conversations.find((c) => c.id === fromUrl)
      ? fromUrl
      : conversations[0].id;
    if (target !== activeId) setActiveId(target);
  }, [conversations, query, activeId]);

  // Load messages when active conversation changes
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMsgs(true);
    setError('');
    try {
      const data = await api<{ messages: MessagePayload[]; nextCursor: { createdAt: string; id: string } | null }>(
        `/conversations/${conversationId}/messages`,
      );
      setMessages(data.messages);
      setHasMore(!!data.nextCursor);
      cursorRef.current = data.nextCursor;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'بارگذاری پیام‌ها ناموفق بود');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    setSidebarOpen(false);
  }, [activeId, loadMessages]);

  // Socket connection
  useEffect(() => {
    if (!hydrated || !user || !activeId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleMessage = (msg: MessagePayload) => {
      if (msg.conversationId !== activeId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as read if we're viewing this conversation
      socket.emit(ChatEvents.READ, { conversationId: activeId, messageId: msg.id });
    };

    const handleDeleted = (data: { conversationId: string; messageId: string }) => {
      if (data.conversationId !== activeId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, isDeleted: true, content: null, mediaUrl: null }
            : m,
        ),
      );
    };

    const handleTyping = (data: { conversationId: string; userId: string; username: string; isTyping: boolean }) => {
      if (data.conversationId !== activeId || data.userId === user.id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (data.isTyping) {
          next[data.userId] = data.username;
        } else {
          delete next[data.userId];
        }
        return next;
      });
      if (data.isTyping) {
        if (typingTimeouts.current[data.userId]) clearTimeout(typingTimeouts.current[data.userId]);
        typingTimeouts.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          });
        }, 4000);
      }
    };

    const handlePresence = (data: { conversationId: string; userIds: string[] }) => {
      if (data.conversationId !== activeId) return;
      setOnlineUsers(data.userIds);
    };

    const handleReadState = (data: { conversationId: string; userId: string; messageId: string }) => {
      // Could update read receipts here; minimal implementation
    };

    // Join the conversation room
    socket.emit(ChatEvents.JOIN, { conversationId: activeId });

    socket.on(ChatEvents.MESSAGE, handleMessage);
    socket.on(ChatEvents.DELETED, handleDeleted);
    socket.on(ChatEvents.TYPING_STATE, handleTyping);
    socket.on(ChatEvents.PRESENCE, handlePresence);
    socket.on(ChatEvents.READ_STATE, handleReadState);

    return () => {
      socket.off(ChatEvents.MESSAGE, handleMessage);
      socket.off(ChatEvents.DELETED, handleDeleted);
      socket.off(ChatEvents.TYPING_STATE, handleTyping);
      socket.off(ChatEvents.PRESENCE, handlePresence);
      socket.off(ChatEvents.READ_STATE, handleReadState);
    };
  }, [hydrated, user, activeId]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load older messages (infinite scroll up)
  const loadOlder = useCallback(async () => {
    if (!activeId || !hasMore || loadingMsgs) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const prevScrollHeight = container.scrollHeight;

    setLoadingMsgs(true);
    try {
      const data = await api<{ messages: MessagePayload[]; nextCursor: { createdAt: string; id: string } | null }>(
        `/conversations/${activeId}/messages?beforeCreatedAt=${cursorRef.current!.createdAt}&beforeId=${cursorRef.current!.id}`,
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(!!data.nextCursor);
      cursorRef.current = data.nextCursor;
      // Maintain scroll position
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    } catch {
      // silent
    } finally {
      setLoadingMsgs(false);
    }
  }, [activeId, hasMore, loadingMsgs]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || container.scrollTop > 100) return;
    loadOlder();
  }, [loadOlder]);

  // Send text message
  const sendText = useCallback(async () => {
    if (!activeId || !text.trim() || !user) return;
    const content = text.trim();
    setText('');

    const socket = getSocket();
    if (!socket) return;

    const dto: SendMessageDto = {
      conversationId: activeId,
      type: 'TEXT',
      content,
      replyToId: replyTo?.id,
    };
    setReplyTo(null);

    socket.emit(ChatEvents.SEND, dto, (ack: MessagePayload | { error?: string }) => {
      if (ack && 'id' in ack) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === ack.id)) return prev;
          return [...prev, ack];
        });
      }
    });
  }, [activeId, text, user, replyTo]);

  // Send image
  const sendImage = useCallback(async (file: File) => {
    if (!activeId || !user || sendingImage) return;
    setSendingImage(true);
    try {
      const result = await upload<{ url: string; width: number; height: number }>('/upload/chat', file);
      const socket = getSocket();
      if (!socket) return;

      const dto: SendMessageDto = {
        conversationId: activeId,
        type: 'IMAGE',
        mediaUrl: result.url,
        mediaWidth: result.width,
        mediaHeight: result.height,
        replyToId: replyTo?.id,
      };
      setReplyTo(null);

      socket.emit(ChatEvents.SEND, dto, (ack: MessagePayload | { error?: string }) => {
        if (ack && 'id' in ack) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === ack.id)) return prev;
            return [...prev, ack];
          });
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ارسال تصویر ناموفق بود');
    } finally {
      setSendingImage(false);
    }
  }, [activeId, user, sendingImage, replyTo]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!activeId || !text.trim()) return;
    const socket = getSocket();
    socket?.emit(ChatEvents.TYPING, { conversationId: activeId, isTyping: true });
  }, [activeId, text]);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    const socket = getSocket();
    socket?.emit(ChatEvents.DELETE, { messageId });
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendText();
  };

  if (!hydrated) return <Spinner />;
  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} fixed inset-y-0 right-0 z-30 w-72 border-l border-white/[.07] bg-black transition-transform md:relative md:z-0`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-white/[.07] px-4 py-4">
            <h2 className="font-bold">گفتگوها</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--muted)]">در حال بارگذاری…</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveId(conv.id); router.push(`/chat?conversation=${conv.id}`); }}
                  className={`mb-1 w-full rounded-xl p-3 text-right transition ${activeId === conv.id ? 'bg-white/[.07]' : 'hover:bg-white/[.03]'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{conv.title || (conv.type === 'GLOBAL' ? 'چت عمومی' : 'پشتیبانی')}</span>
                    {conv.unreadCount > 0 && <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{conv.unreadCount}</span>}
                  </div>
                  {conv.lastMessage && (
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">
                      {conv.lastMessage.isDeleted ? 'پیام حذف شده' : conv.lastMessage.content || 'تصویر'}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <span className="text-lg">☰</span>
            </button>
            <div>
              <h1 className="font-bold">{activeConv?.title || 'چت عمومی'}</h1>
              {onlineUsers.length > 0 && activeId && (
                <p className="text-xs text-emerald-400">{onlineUsers.length} نفر آنلاین</p>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          {loadingMsgs && messages.length === 0 ? (
            <Spinner />
          ) : error && messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-red-300">{error}</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">هنوز پیامی ارسال نشده است</p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-1">
              {hasMore && (
                <button onClick={loadOlder} className="mx-auto block py-2 text-xs text-blue-300 hover:text-blue-200">
                  {loadingMsgs ? 'در حال بارگذاری…' : 'مشاهده پیام‌های قدیمی‌تر'}
                </button>
              )}
              {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showDay = !prev || formatDayLabel(prev.createdAt) !== formatDayLabel(msg.createdAt);
                return (
                  <div key={msg.id}>
                    {showDay && (
                      <div className="my-3 text-center">
                        <span className="rounded-full bg-white/[.05] px-3 py-1 text-xs text-[var(--muted)]">
                          {formatDayLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      msg={msg}
                      isMine={msg.senderId === user?.id}
                      isAdmin={user?.role === 'ADMIN'}
                      onReply={() => setReplyTo(msg)}
                      onDelete={() => deleteMessage(msg.id)}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="px-4 py-1 text-xs text-[var(--muted)]">
            {Object.values(typingUsers).join('، ')} در حال نوشتن…
          </div>
        )}

        {/* Reply banner */}
        {replyTo && (
          <div className="flex items-center justify-between border-t border-white/[.07] bg-white/[.02] px-4 py-2">
            <div className="min-w-0">
              <span className="text-xs text-blue-300">پاسخ به {replyTo.sender.username}</span>
              <p className="truncate text-xs text-[var(--muted)]">{replyTo.content || 'تصویر'}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-sm text-[var(--muted)] hover:text-white">×</button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/[.07] p-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ''; }}
              disabled={sendingImage}
            />
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-lg ${sendingImage ? 'opacity-50' : 'hover:bg-white/5'}`}>
              {sendingImage ? '⏳' : '📎'}
            </span>
          </label>
          <input
            className="field flex-1"
            placeholder="پیام خود را بنویسید…"
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            disabled={sendingImage}
          />
          <button type="submit" className="btn px-5" disabled={!text.trim() || sendingImage}>
            ارسال
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  isAdmin,
  onReply,
  onDelete,
}: {
  msg: MessagePayload;
  isMine: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  if (msg.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[75%] rounded-2xl bg-white/[.03] px-4 py-2 text-xs italic text-[var(--muted)]">
          این پیام حذف شده است
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <span className="mb-0.5 block text-xs font-semibold text-blue-300">{msg.sender.username}</span>
        )}
        {msg.replyToId && (
          <div className="mb-1 rounded-lg border-r-2 border-blue-400/40 bg-white/[.03] px-2 py-1 text-xs text-[var(--muted)]">
            پاسخ به پیام
          </div>
        )}
        <div
          className={`relative rounded-2xl px-4 py-2 ${
            isMine ? 'bg-blue-600/30 text-white' : 'bg-white/[.06] text-white'
          }`}
        >
          {msg.type === 'IMAGE' && msg.mediaUrl && (
            <a href={mediaUrl(msg.mediaUrl)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(msg.mediaUrl)}
                alt="تصویر"
                className="mb-1 max-h-60 rounded-lg object-cover"
                style={{ maxWidth: msg.mediaWidth ? Math.min(msg.mediaWidth, 320) : 320 }}
              />
            </a>
          )}
          {msg.content && <p className="whitespace-pre-wrap break-words text-sm leading-7">{msg.content}</p>}
          <span className="mt-0.5 block text-[10px] text-white/40">{formatTime(msg.createdAt)}</span>
        </div>
        <div className={`mt-0.5 flex gap-2 ${isMine ? 'justify-end' : 'justify-start'} opacity-0 transition group-hover:opacity-100`}>
          <button onClick={onReply} className="text-[10px] text-[var(--muted)] hover:text-white">پاسخ</button>
          {(isMine || isAdmin) && (
            <button onClick={onDelete} className="text-[10px] text-red-400/70 hover:text-red-300">حذف</button>
          )}
        </div>
      </div>
    </div>
  );
}
