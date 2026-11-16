import { io, type Socket } from 'socket.io-client';
import { API_URL } from './config';

type Handler = (payload: unknown) => void;

let socket: Socket | null = null;

// Screens subscribe when they mount, which can be before the socket exists (a guest, or just
// before login) or before a new login replaces it. Keeping the handlers here means whichever
// socket is current always gets all of them.
const handlers = new Map<string, Set<Handler>>();

function apiOrigin(): string {
  return API_URL.replace(/\/api\/v1\/?$/, '');
}

// Without a token this is a guest connection: it receives public events (charger status,
// station and booking changes) but nothing addressed to a user.
export function connectSocket(token?: string): Socket {
  socket?.disconnect();
  const next = io(apiOrigin(), { auth: token ? { token } : {} });
  handlers.forEach((set, event) => set.forEach((handler) => next.on(event, handler)));
  socket = next;
  return next;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function onEvent(event: string, handler: Handler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  socket?.on(event, handler);
  return () => {
    set.delete(handler);
    socket?.off(event, handler);
  };
}
