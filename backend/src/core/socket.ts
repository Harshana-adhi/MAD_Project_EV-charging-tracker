import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketServer | undefined;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('UNAUTHENTICATED'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
      socket.data.userId = payload.sub as string;
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function broadcast(event: string, payload: unknown): void {
  io?.emit(event, payload);
}
