'use client';

import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/stores/auth';

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '/api');

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = useAuth.getState().accessToken;
  if (!token) return null;

  if (socket && socket.connected) return socket;
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const origin = API_ORIGIN.startsWith('http') ? new URL(API_ORIGIN).origin : '';
  socket = io(origin || undefined, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('disconnect', () => {
    // keep socket object for reconnection; not cleaned up here
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
