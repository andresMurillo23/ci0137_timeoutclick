const GameSocketHandler = require('./gameSocket');

/**
 * Main Socket.IO configuration and initialization
 * Handles all real-time communication for TimeoutClick
 */

class SocketManager {
  constructor(io, sessionMiddleware) {
    this.io = io;
    this.sessionMiddleware = sessionMiddleware;
    this.gameHandler = new GameSocketHandler(io);
    this.connectedUsers = new Map();
    this.initialize();
  }

  /**
   * Initialize Socket.IO middleware and events
   */
  initialize() {
    this.io.use((socket, next) => {
      this.sessionMiddleware(socket.request, {}, next);
    });

    this.io.use(async (socket, next) => {
      try {
        const session = socket.request.session;
        if (!session || !session.userId) {
          return next(new Error('Authentication required'));
        }
        
        socket.userId = session.userId;
        socket.username = session.username;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    setInterval(() => {
      this.broadcastOnlineUsers();
    }, 30000);
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    console.log(`User ${socket.username} connected with socket ${socket.id}`);

    this.connectedUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      connectedAt: new Date(),
      status: 'online'
    });

    socket.emit('connection_established', {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      serverTime: new Date()
    });

    this.gameHandler.initializeEvents(socket);

    socket.on('ping', (callback) => {
      if (callback) callback({ serverTime: Date.now() });
    });

    socket.on('user_status_update', (data) => {
      this.handleUserStatusUpdate(socket, data);
    });

    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    this.broadcastUserConnected(socket);
  }

  /**
   * Handle user status updates
   */
  handleUserStatusUpdate(socket, data) {
    const user = this.connectedUsers.get(socket.userId);
    if (user) {
      user.status = data.status || 'online';
      this.connectedUsers.set(socket.userId, user);
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket, reason) {
    console.log(`User ${socket.username} disconnected: ${reason}`);

    this.connectedUsers.delete(socket.userId);
    this.broadcastUserDisconnected(socket);
  }

  /**
   * Broadcast when user connects
   */
  broadcastUserConnected(socket) {
    socket.broadcast.emit('user_connected', {
      userId: socket.userId,
      username: socket.username,
      connectedAt: new Date()
    });
  }

  /**
   * Broadcast when user disconnects
   */
  broadcastUserDisconnected(socket) {
    socket.broadcast.emit('user_disconnected', {
      userId: socket.userId,
      username: socket.username,
      disconnectedAt: new Date()
    });
  }

  /**
   * Broadcast online users count periodically
   */
  broadcastOnlineUsers() {
    const onlineCount = this.connectedUsers.size;
    const users = Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userId,
      username: user.username,
      status: user.status,
      connectedAt: user.connectedAt
    }));

    this.io.emit('online_users_update', {
      count: onlineCount,
      users: users,
      timestamp: new Date()
    });
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId, notification) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit('notification', notification);
      return true;
    }
    return false;
  }

  /**
   * Send game invitation to user
   */
  sendGameInvitation(receiverId, invitation) {
    return this.sendNotificationToUser(receiverId, {
      type: 'game_invitation',
      data: invitation,
      timestamp: new Date()
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get online users list
   */
  getOnlineUsers() {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Cleanup inactive sessions periodically
   */
  startCleanupTask() {
    setInterval(async () => {
      try {
        const GameSession = require('../models/GameSession');
        await GameSession.cleanupInactiveSessions(30);
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * Initialize Socket.IO with Express session
 */
const initializeSocket = (server, sessionMiddleware) => {
  const { Server } = require('socket.io');
  
  const io = new Server(server, {
    cors: {
      origin: `http://localhost:${process.env.FRONTEND_PORT || 8080}`,
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  const socketManager = new SocketManager(io, sessionMiddleware);
  socketManager.startCleanupTask();

  return { io, socketManager };
};

module.exports = { initializeSocket, SocketManager };