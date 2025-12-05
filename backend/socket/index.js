const GameSocketHandler = require('./gameSocket');

/**
 * Main Socket.IO configuration and initialization
 * Handles all real-time communication for TimeoutClick
 */

class SocketManager {
  constructor(io) {
    this.io = io;
    this.gameHandler = new GameSocketHandler(io);
    this.connectedUsers = new Map();
    this.initialize();
  }

  /**
   * Initialize Socket.IO middleware and events
   */
  initialize() {
    // Authenticate Socket.IO connections using token
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        // Decode token (base64 encoded user ID)
        const userId = Buffer.from(token, 'base64').toString('utf8');
        
        // Check if it's a guest user
        if (userId.startsWith('guest_')) {
          console.log('[SOCKET] Guest user connecting:', userId);
          socket.userId = null;  // No user ID for guests
          socket.username = 'Guest';
          socket.isGuest = true;
          return next();
        }
        
        // Get user from database to verify and get username
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        if (!user || user.status !== 'active') {
          return next(new Error('Invalid user'));
        }
        
        socket.userId = user._id.toString();
        socket.username = user.username;
        socket.isGuest = false;
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
    console.log(`[SOCKET] User ${socket.username} connected with socket ${socket.id}`);
    console.log(`[SOCKET] User ID: ${socket.userId} (type: ${typeof socket.userId})`);

    this.connectedUsers.set(socket.userId, {
      userId: socket.userId,
      socketId: socket.id,
      username: socket.username,
      connectedAt: new Date(),
      status: 'online'
    });
    
    console.log(`[SOCKET] Total connected users: ${this.connectedUsers.size}`);

    socket.emit('connection_established', {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      serverTime: new Date()
    });

    this.gameHandler.initializeEvents(socket);

    // Challenge events
    socket.on('send_challenge', (data) => this.handleSendChallenge(socket, data));
    socket.on('accept_challenge', (data) => this.handleAcceptChallenge(socket, data));
    socket.on('decline_challenge', (data) => this.handleDeclineChallenge(socket, data));
    socket.on('cancel_challenge', (data) => this.handleCancelChallenge(socket, data));

    socket.on('ping', (callback) => {
      if (callback) callback({ serverTime: Date.now() });
    });

    socket.on('user_status_update', (data) => {
      this.handleUserStatusUpdate(socket, data);
    });

    socket.on('get_online_users', () => {
      this.sendOnlineUsersToSocket(socket);
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
  async handleDisconnection(socket, reason) {
    console.log(`[SOCKET] User ${socket.username} disconnected: ${reason}`);

    // Cancel any pending challenges sent by this user
    try {
      const Game = require('../models/Game');
      const GameSession = require('../models/GameSession');
      
      // Cancel waiting challenges (but NOT guest_challenge games - they handle disconnects differently)
      await Game.updateMany(
        {
          player1: socket.userId,
          status: 'waiting',
          gameType: { $ne: 'guest_challenge' } // Don't cancel guest challenges
        },
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'sender_disconnected'
        }
      );

      // Don't cancel active/starting games on main socket disconnect
      // They have their own game socket connection and will be handled by gameSocket.js
      // Only cancel if game has been stuck for more than 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 120000);
      
      const stuckGames = await Game.find({
        $or: [
          { player1: socket.userId },
          { player2: socket.userId }
        ],
        status: { $in: ['starting', 'active'] },
        gameType: { $ne: 'guest_challenge' }, // Don't auto-cancel guest challenges
        updatedAt: { $lt: twoMinutesAgo }
      });

      // For stuck games, check if there's an active game session
      for (const game of stuckGames) {
        const gameSession = await GameSession.findOne({ gameId: game._id });
        
        // Only cancel if no active game session (means they never joined the game properly)
        if (!gameSession || gameSession.getConnectedPlayersCount() === 0) {
          game.status = 'cancelled';
          game.gameEndedAt = new Date();
          game.cancelReason = 'player_never_joined_timeout';
          await game.save();
          console.log(`[SOCKET] Cancelled stuck game ${game._id} (no players joined for 2+ minutes)`);
        }
      }
      
    } catch (error) {
      console.error('[SOCKET] Error cancelling games on disconnect:', error);
    }

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
   * Send online users list to a specific socket
   */
  sendOnlineUsersToSocket(socket) {
    const onlineCount = this.connectedUsers.size;
    const users = Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.userId || user.socketId, // Fallback to socketId if userId not set
      username: user.username,
      status: user.status,
      connectedAt: user.connectedAt
    }));

    console.log(`[SOCKET] Sending online users to ${socket.username}:`, users.map(u => `${u.username}(${u.userId})`).join(', '));

    socket.emit('online_users_update', {
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
   * Handle send challenge event
   */
  async handleSendChallenge(socket, data) {
    try {
      const { gameId, opponentId } = data;
      
      console.log('[SOCKET] Send challenge request:', { gameId, opponentId, sender: socket.userId });
      console.log('[SOCKET] OpponentId type:', typeof opponentId);
      console.log('[SOCKET] Connected users:', Array.from(this.connectedUsers.keys()));
      
      if (!gameId || !opponentId) {
        socket.emit('challenge_error', { message: 'Missing game ID or opponent ID' });
        return;
      }

      // Convert opponentId to string to ensure proper comparison
      const opponentIdStr = String(opponentId);
      
      // Check if opponent is online
      const opponent = this.connectedUsers.get(opponentIdStr);
      console.log('[SOCKET] Looking for opponent:', opponentIdStr);
      console.log('[SOCKET] Opponent lookup result:', opponent);
      
      if (!opponent) {
        // Try to find by checking all connected users
        console.log('[SOCKET] Detailed connected users:');
        this.connectedUsers.forEach((value, key) => {
          console.log(`  - Key: "${key}" (type: ${typeof key}), User: ${value.username}`);
        });
        socket.emit('challenge_error', { message: 'Opponent is not online' });
        return;
      }

      // Get game details
      const Game = require('../models/Game');
      const game = await Game.findById(gameId).populate('player1 player2');
      
      if (!game) {
        socket.emit('challenge_error', { message: 'Game not found' });
        return;
      }

      // Send challenge to opponent
      console.log(`[SOCKET] Sending challenge_received to socket ${opponent.socketId}`);
      this.io.to(opponent.socketId).emit('challenge_received', {
        gameId: game._id,
        challengerId: socket.userId,
        challenger: {
          id: socket.userId,
          username: socket.username
        },
        goalTime: game.goalTime,
        timestamp: new Date()
      });

      console.log(`[SOCKET] Challenge sent from ${socket.username} to ${opponent.username}`);

    } catch (error) {
      console.error('[SOCKET] Send challenge error:', error);
      socket.emit('challenge_error', { message: 'Failed to send challenge' });
    }
  }

  /**
   * Handle accept challenge event
   */
  async handleAcceptChallenge(socket, data) {
    try {
      const { gameId, challengerId } = data;

      // Update game status to active
      const Game = require('../models/Game');
      const game = await Game.findByIdAndUpdate(
        gameId,
        { status: 'active', startedAt: new Date() },
        { new: true }
      );

      if (!game) {
        socket.emit('challenge_error', { message: 'Game not found' });
        return;
      }

      // Notify challenger that challenge was accepted
      const challenger = this.connectedUsers.get(challengerId);
      if (challenger) {
        this.io.to(challenger.socketId).emit('challenge_accepted', {
          gameId: game._id,
          acceptedBy: socket.username,
          timestamp: new Date()
        });
      }

      // Notify accepter
      socket.emit('challenge_accepted', {
        gameId: game._id,
        acceptedBy: socket.username,
        timestamp: new Date()
      });

      console.log(`[SOCKET] Challenge accepted by ${socket.username} for game ${gameId}`);

    } catch (error) {
      console.error('[SOCKET] Accept challenge error:', error);
      socket.emit('challenge_error', { message: 'Failed to accept challenge' });
    }
  }

  /**
   * Handle decline challenge event
   */
  async handleDeclineChallenge(socket, data) {
    try {
      const { gameId, challengerId } = data;

      // Update game status to cancelled
      const Game = require('../models/Game');
      await Game.findByIdAndUpdate(gameId, { 
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'declined'
      });

      // Notify challenger that challenge was declined
      const challenger = this.connectedUsers.get(challengerId);
      if (challenger) {
        this.io.to(challenger.socketId).emit('challenge_declined', {
          gameId: gameId,
          declinedBy: socket.username,
          timestamp: new Date()
        });
      }

      console.log(`[SOCKET] Challenge declined by ${socket.username} for game ${gameId}`);

    } catch (error) {
      console.error('[SOCKET] Decline challenge error:', error);
      socket.emit('challenge_error', { message: 'Failed to decline challenge' });
    }
  }

  /**
   * Handle cancel challenge event
   */
  async handleCancelChallenge(socket, data) {
    try {
      const { gameId, opponentId } = data;

      // Update game status to cancelled
      const Game = require('../models/Game');
      await Game.findByIdAndUpdate(gameId, { 
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'cancelled_by_sender'
      });

      // Notify opponent that challenge was cancelled
      const opponent = this.connectedUsers.get(opponentId);
      if (opponent) {
        this.io.to(opponent.socketId).emit('challenge_cancelled', {
          gameId: gameId,
          cancelledBy: socket.username,
          timestamp: new Date()
        });
      }

      console.log(`[SOCKET] Challenge cancelled by ${socket.username} for game ${gameId}`);

    } catch (error) {
      console.error('[SOCKET] Cancel challenge error:', error);
      socket.emit('challenge_error', { message: 'Failed to cancel challenge' });
    }
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
 * Initialize Socket.IO without session middleware (using token auth)
 */
const initializeSocket = (server) => {
  const { Server } = require('socket.io');
  
  const io = new Server(server, {
    cors: {
      origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          `http://localhost:${process.env.FRONTEND_PORT || 5000}`,
          'http://localhost:3000',
          'http://localhost:5000',
          'https://ci0137-timeoutclick.vercel.app'
        ];
        
        // Allow any ngrok domain for testing
        if (origin.includes('ngrok') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  const socketManager = new SocketManager(io);
  socketManager.startCleanupTask();

  return { io, socketManager };
};

module.exports = { initializeSocket, SocketManager };