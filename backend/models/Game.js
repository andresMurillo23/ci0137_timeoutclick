const mongoose = require('mongoose');

/**
 * Game model for TimeoutClick matches
 * Handles 1v1 games with goal time mechanics
 */
const gameSchema = new mongoose.Schema({
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,  // Allow null for guest users
    default: null
  },
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalTime: {
    type: Number,
    required: true,
    min: 5000,
    max: 10000
  },
  player1Time: {
    type: Number,
    default: null
  },
  player2Time: {
    type: Number,
    default: null
  },
  player1ClickTime: {
    type: Date,
    default: null
  },
  player2ClickTime: {
    type: Date,
    default: null
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'starting', 'active', 'finished', 'cancelled', 'timeout'],
    default: 'waiting'
  },
  gameStartedAt: {
    type: Date,
    default: null
  },
  gameEndedAt: {
    type: Date,
    default: null
  },
  gameType: {
    type: String,
    enum: ['challenge', 'random', 'tournament', 'guest_challenge'],
    default: 'challenge'
  },
  settings: {
    maxWaitTime: {
      type: Number,
      default: 30000
    },
    countdownTime: {
      type: Number,
      default: 3000
    }
  },
  rounds: [{
    roundNumber: {
      type: Number,
      required: true
    },
    goalTime: {
      type: Number,
      required: true
    },
    player1Time: {
      type: Number,
      default: null
    },
    player2Time: {
      type: Number,
      default: null
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    }
  }],
  currentRound: {
    type: Number,
    default: 1
  },
  totalRounds: {
    type: Number,
    default: 3  // Best of 3
  },
  player1Score: {
    type: Number,
    default: 0
  },
  player2Score: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

/**
 * Indexes for efficient queries
 */
gameSchema.index({ player1: 1, status: 1 });
gameSchema.index({ player2: 1, status: 1 });
gameSchema.index({ status: 1, createdAt: -1 });
gameSchema.index({ gameType: 1, status: 1 });

/**
 * Generate random goal time between 5-10 seconds
 */
gameSchema.statics.generateGoalTime = function() {
  return Math.floor(Math.random() * 5000) + 5000; // 5000-10000ms (5-10 seconds)
};

/**
 * Calculate winner based on closest time to goal
 */
gameSchema.methods.calculateWinner = function() {
  if (this.player1Time === null && this.player2Time === null) {
    return null;
  }
  
  if (this.player1Time === null) {
    return this.player2;
  }
  
  if (this.player2Time === null) {
    return this.player1;
  }

  const player1Diff = Math.abs(this.player1Time - this.goalTime);
  const player2Diff = Math.abs(this.player2Time - this.goalTime);
  
  if (player1Diff < player2Diff) {
    return this.player1;
  } else if (player2Diff < player1Diff) {
    return this.player2;
  } else {
    return null;
  }
};

/**
 * Check if game is complete
 */
gameSchema.methods.isComplete = function() {
  return this.player1Time !== null && this.player2Time !== null;
};

/**
 * Get game result for a specific player
 */
gameSchema.methods.getResultForPlayer = function(playerId) {
  if (this.status !== 'finished') {
    return 'ongoing';
  }
  
  if (!this.winner) {
    return 'tie';
  }
  
  return this.winner.toString() === playerId.toString() ? 'win' : 'lose';
};

/**
 * Static method to find active games for a user
 */
gameSchema.statics.findActiveGameForUser = async function(userId) {
  // Only block users who are actually playing (not just waiting for challenge acceptance)
  return await this.findOne({
    $or: [
      { player1: userId },
      { player2: userId }
    ],
    status: { $in: ['starting', 'active'] }
  });
};

/**
 * Static method to get user game stats
 */
gameSchema.statics.getUserGameStats = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: {
        $or: [
          { player1: new mongoose.Types.ObjectId(userId) },
          { player2: new mongoose.Types.ObjectId(userId) }
        ],
        status: 'finished'
      }
    },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        wins: {
          $sum: {
            $cond: [
              { $eq: ['$winner', new mongoose.Types.ObjectId(userId)] },
              1,
              0
            ]
          }
        },
        averageTime: {
          $avg: {
            $cond: [
              { $eq: ['$player1', new mongoose.Types.ObjectId(userId)] },
              '$player1Time',
              '$player2Time'
            ]
          }
        },
        bestTime: {
          $min: {
            $abs: {
              $subtract: [
                {
                  $cond: [
                    { $eq: ['$player1', new mongoose.Types.ObjectId(userId)] },
                    '$player1Time',
                    '$player2Time'
                  ]
                },
                '$goalTime'
              ]
            }
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalGames: 0,
    wins: 0,
    averageTime: 0,
    bestTime: null
  };
};

module.exports = mongoose.model('Game', gameSchema);