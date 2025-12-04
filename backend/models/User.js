const mongoose = require('mongoose');

/**
 * User schema for TimeoutClick game
 * Designed to work with both local MongoDB and Atlas
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    country: {
      type: String,
      trim: true,
      maxlength: 50
    }
  },
  gameStats: {
    gamesPlayed: {
      type: Number,
      default: 0
    },
    gamesWon: {
      type: Number,
      default: 0
    },
    totalScore: {
      type: Number,
      default: 0
    },
    bestTime: {
      type: Number,
      default: null
    },
    averageTime: {
      type: Number,
      default: 0
    }
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  }
});

/**
 * Indexes for better performance on Atlas
 */
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'gameStats.totalScore': -1 });
userSchema.index({ lastActive: -1 });

/**
 * Virtual for win rate calculation
 */
userSchema.virtual('winRate').get(function() {
  const gp = Number(this.gameStats?.gamesPlayed || 0);
  let gw = Number(this.gameStats?.gamesWon || 0);

  if (gp === 0) return 0;

  // Sanitize values: clamp gamesWon to [0, gamesPlayed]
  if (gw < 0) gw = 0;
  if (gw > gp) gw = gp;

  const ratio = gw / gp;
  return Math.round(ratio * 100);
});

module.exports = mongoose.model('User', userSchema);