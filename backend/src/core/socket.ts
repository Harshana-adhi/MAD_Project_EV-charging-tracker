import { randomUUID } from 'crypto';
import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

let io: SocketServer | undefined;

// Every backend instance gets its own id, so it can skip relayed events it sent itself.
const INSTANCE_ID = randomUUID();
const POLL_MS = 1500;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    // Guests may connect too, so they see charger and station changes live; they just
    // never join a user room.
    if (!token) return next();
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
      socket.data.userId = payload.sub as string;
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.userId) socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

// Socket.IO only reaches phones connected to this one process. When several backends share
// a database (each developer runs their own), an event is also written to realtime_events
// so the others can pick it up and pass it on to their own phones.
function relay(event: string, payload: unknown, userId?: string): void {
  prisma.realtimeEvent
    .create({ data: { event, payload: payload as object, userId: userId ?? null, source: INSTANCE_ID } })
    .catch((err) => console.error('realtime relay write failed', err));
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
  relay(event, payload, userId);
}

export function broadcast(event: string, payload: unknown): void {
  io?.emit(event, payload);
  relay(event, payload);
}

export async function startRealtimeRelay(): Promise<void> {
  let lastId = 0;
  try {
    const latest = await prisma.realtimeEvent.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
    lastId = latest?.id ?? 0;
  } catch (err) {
    console.error('realtime relay disabled (run the latest prisma migration):', err);
    return;
  }

  setInterval(async () => {
    try {
      const rows = await prisma.realtimeEvent.findMany({
        where: { id: { gt: lastId } },
        orderBy: { id: 'asc' },
        take: 200,
      });
      for (const row of rows) {
        lastId = row.id;
        if (row.source === INSTANCE_ID) continue;
        if (row.userId) io?.to(`user:${row.userId}`).emit(row.event, row.payload);
        else io?.emit(row.event, row.payload);
      }
    } catch (err) {
      console.error('realtime relay read failed', err);
    }
  }, POLL_MS);

  setInterval(() => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    prisma.realtimeEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => undefined);
  }, 60_000);
}
