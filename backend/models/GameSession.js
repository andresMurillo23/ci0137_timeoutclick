const mongoose = require('mongoose');

/**
 * GameSession model for managing real-time game connections
 * Handles socket connections and game state synchronization
 */
const gameSessionSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    unique: true
  },
  player1SocketId: {
    type: String,
    default: null
  },
  player2SocketId: {
    type: String,
    default: null
  },
  player1Connected: {
    type: Boolean,
    default: false
  },
  player2Connected: {
    type: Boolean,
    default: false
  },
  gameState: {
    type: String,
    enum: ['waiting_players', 'countdown', 'playing', 'finished', 'paused'],
    default: 'waiting_players'
  },
  countdownStartedAt: {
    type: Date,
    default: null
  },
  gameStartedAt: {
    type: Date,
    default: null
  },
  player1ReadyAt: {
    type: Date,
    default: null
  },
  player2ReadyAt: {
    type: Date,
    default: null
  },
  raceLock: {
    type: Boolean,
    default: false
  },
  raceWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  metadata: {
    server: {
      type: String,
      default: process.env.SERVER_ID || 'server-1'
    },
    version: {
      type: String,
      default: '1.0.0'
    }
  }
}, {
  timestamps: true
});

/**
 * Indexes for efficient real-time queries
 */
gameSessionSchema.index({ gameId: 1 });
gameSessionSchema.index({ player1SocketId: 1 });
gameSessionSchema.index({ player2SocketId: 1 });
gameSessionSchema.index({ gameState: 1, lastActivity: -1 });
gameSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 3600 });

/**
 * Update last activity on any change
 */
gameSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

/**
 * Check if both players are connected
 */
gameSessionSchema.methods.areBothPlayersConnected = function() {
  return this.player1Connected && this.player2Connected;
};

/**
 * Get connected players count
 */
gameSessionSchema.methods.getConnectedPlayersCount = function() {
  let count = 0;
  if (this.player1Connected) count++;
  if (this.player2Connected) count++;
  return count;
};

/**
 * Set player socket connection
 */
gameSessionSchema.methods.setPlayerConnection = function(playerId, socketId, connected = true) {
  if (this.gameId.player1.toString() === playerId.toString()) {
    this.player1SocketId = socketId;
    this.player1Connected = connected;
  } else if (this.gameId.player2.toString() === playerId.toString()) {
    this.player2SocketId = socketId;
    this.player2Connected = connected;
  }
};

/**
 * Disconnect player
 */
gameSessionSchema.methods.disconnectPlayer = function(socketId) {
  if (this.player1SocketId === socketId) {
    this.player1Connected = false;
    this.player1SocketId = null;
  } else if (this.player2SocketId === socketId) {
    this.player2Connected = false;
    this.player2SocketId = null;
  }
};

/**
 * Get opponent socket ID
 */
gameSessionSchema.methods.getOpponentSocketId = function(playerSocketId) {
  if (this.player1SocketId === playerSocketId) {
    return this.player2SocketId;
  } else if (this.player2SocketId === playerSocketId) {
    return this.player1SocketId;
  }
  return null;
};

/**
 * Set race condition lock to prevent race conditions
 */
gameSessionSchema.methods.setRaceLock = async function(playerId) {
  if (this.raceLock) {
    return false;
  }
  
  this.raceLock = true;
  this.raceWinner = playerId;
  await this.save();
  return true;
};

/**
 * Release race lock
 */
gameSessionSchema.methods.releaseRaceLock = async function() {
  this.raceLock = false;
  this.raceWinner = null;
  await this.save();
};

/**
 * Static method to find session by socket ID
 */
gameSessionSchema.statics.findBySocketId = async function(socketId) {
  return await this.findOne({
    $or: [
      { player1SocketId: socketId },
      { player2SocketId: socketId }
    ]
  }).populate('gameId');
};

/**
 * Static method to cleanup inactive sessions
 */
gameSessionSchema.statics.cleanupInactiveSessions = async function(maxInactiveMinutes = 30) {
  const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
  return await this.deleteMany({
    lastActivity: { $lt: cutoffTime },
    gameState: { $nin: ['playing'] }
  });
};

/**
 * Static method to get all active sessions
 */
gameSessionSchema.statics.getActiveSessions = async function() {
  return await this.find({
    gameState: { $in: ['waiting_players', 'countdown', 'playing'] }
  }).populate('gameId');
};

module.exports = mongoose.model('GameSession', gameSessionSchema);