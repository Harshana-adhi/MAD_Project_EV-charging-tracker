import { io, type Socket } from 'socket.io-client';
import { API_URL } from './config';

let socket: Socket | null = null;

function apiOrigin(): string {
  return API_URL.replace(/\/api\/v1\/?$/, '');
}

export function connectSocket(token: string): Socket {
  socket = io(apiOrigin(), { auth: { token } });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function onEvent(event: string, handler: (payload: unknown) => void): () => void {
  socket?.on(event, handler);
  return () => socket?.off(event, handler);
}
