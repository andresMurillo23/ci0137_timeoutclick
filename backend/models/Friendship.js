const mongoose = require('mongoose');

/**
 * Friendship model for managing user relationships
 * Handles accepted friendships between users
 */
const friendshipSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'deleted'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

/**
 * Indexes for efficient queries
 */
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });
friendshipSchema.index({ user1: 1, status: 1 });
friendshipSchema.index({ user2: 1, status: 1 });

/**
 * Ensure user1 is always the smaller ObjectId for consistency
 */
friendshipSchema.pre('save', function(next) {
  if (this.user1.toString() > this.user2.toString()) {
    [this.user1, this.user2] = [this.user2, this.user1];
  }
  next();
});

/**
 * Static method to check if two users are friends
 */
friendshipSchema.statics.areFriends = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { user1: userId1, user2: userId2 },
      { user1: userId2, user2: userId1 }
    ],
    status: 'active'
  });
  return !!friendship;
};

/**
 * Static method to get all friends of a user
 */
friendshipSchema.statics.getFriends = async function(userId) {
  const friendships = await this.find({
    $or: [
      { user1: userId },
      { user2: userId }
    ],
    status: 'active'
  }).populate('user1 user2', 'username avatar profile.firstName profile.lastName gameStats lastActive');

  return friendships.map(friendship => {
    const friend = friendship.user1._id.toString() === userId.toString() 
      ? friendship.user2 
      : friendship.user1;
    
    return {
      id: friend._id,
      username: friend.username,
      avatar: friend.avatar,
      firstName: friend.profile?.firstName,
      lastName: friend.profile?.lastName,
      totalScore: friend.gameStats?.totalScore || 0,
      gamesPlayed: friend.gameStats?.gamesPlayed || 0,
      lastActive: friend.lastActive,
      friendshipDate: friendship.createdAt
    };
  });
};

/**
 * Static method to remove friendship
 */
friendshipSchema.statics.removeFriendship = async function(userId1, userId2) {
  return await this.findOneAndUpdate(
    {
      $or: [
        { user1: userId1, user2: userId2 },
        { user1: userId2, user2: userId1 }
      ]
    },
    { status: 'deleted' },
    { new: true }
  );
};

/**
 * Static method to reactivate deleted friendship
 */
friendshipSchema.statics.reactivateFriendship = async function(userId1, userId2, createdBy) {
  return await this.findOneAndUpdate(
    {
      $or: [
        { user1: userId1, user2: userId2 },
        { user1: userId2, user2: userId1 }
      ],
      status: 'deleted'
    },
    { 
      status: 'active',
      createdBy: createdBy
    },
    { new: true }
  );
};

module.exports = mongoose.model('Friendship', friendshipSchema);