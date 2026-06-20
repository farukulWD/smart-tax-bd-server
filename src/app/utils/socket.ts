import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';

let io: SocketIOServer;

const initializeSocketIO = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    pingTimeout: 60000,
    cors: {
      origin: '*',
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.headers.authorization;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connect', socket => {
    const user = (socket as any).user;
    const userId = user?.userId;

    if (userId) {
      socket.join(userId);
      console.log(`⚡ User ${userId} joined room: ${userId}`);

      if (user.role === 'admin' || user.role === 'superAdmin') {
        socket.join('admins');
        console.log(`⚡ Admin ${userId} joined admins room`);
      }
    }

    console.log('⚡ A user connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }
  return io;
};

/**
 * Universal notification helper
 * @param target - userId (string) for targeted notification, or null for broadcast
 * @param key - The notification key (e.g., 'Order_created')
 * @param payload - The data to send
 */
const emitNotification = (target: string | null, key: string, payload: any) => {
  const ioInstance = getIO();
  const data = {
    key,
    payload,
    timestamp: new Date(),
  };

  if (target) {
    ioInstance.to(target).emit('notification', data);
  } else {
    ioInstance.emit('notification', data);
  }
};

const emitToAdmins = (key: string, payload: any) => {
  getIO().to('admins').emit('notification', {
    key,
    payload,
    timestamp: new Date(),
  });
};

export { initializeSocketIO, getIO, emitNotification, emitToAdmins };
