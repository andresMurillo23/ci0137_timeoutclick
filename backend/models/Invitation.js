const mongoose = require('mongoose');

/**
 * Invitation model for managing friend requests
 * Handles pending, accepted, and declined invitations
 */
const invitationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['friend', 'game'],
    default: 'friend'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 200,
    default: ''
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

/**
 * Indexes for efficient queries
 */
invitationSchema.index({ receiver: 1, status: 1 });
invitationSchema.index({ sender: 1, status: 1 });
invitationSchema.index({ sender: 1, receiver: 1, type: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Validation to prevent self-invitations
 */
invitationSchema.pre('save', function(next) {
  if (this.sender.toString() === this.receiver.toString()) {
    const error = new Error('Cannot send invitation to yourself');
    return next(error);
  }
  next();
});

/**
 * Static method to get pending invitations for a user
 */
invitationSchema.statics.getPendingInvitations = async function(userId, type = 'friend') {
  return await this.find({
    receiver: userId,
    type: type,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
  .populate('sender', 'username avatar profile.firstName profile.lastName gameStats')
  .sort({ createdAt: -1 });
};

/**
 * Static method to get sent invitations for a user
 */
invitationSchema.statics.getSentInvitations = async function(userId, type = 'friend') {
  return await this.find({
    sender: userId,
    type: type,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
  .populate('receiver', 'username avatar profile.firstName profile.lastName')
  .sort({ createdAt: -1 });
};

/**
 * Static method to check if invitation already exists
 */
invitationSchema.statics.invitationExists = async function(senderId, receiverId, type = 'friend') {
  const invitation = await this.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId }
    ],
    type: type,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
  return !!invitation;
};

/**
 * Static method to cancel all pending invitations between two users
 */
invitationSchema.statics.cancelPendingInvitations = async function(userId1, userId2, type = 'friend') {
  return await this.updateMany(
    {
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 }
      ],
      type: type,
      status: 'pending'
    },
    { status: 'cancelled' }
  );
};

module.exports = mongoose.model('Invitation', invitationSchema);