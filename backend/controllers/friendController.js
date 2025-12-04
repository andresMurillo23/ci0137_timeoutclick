const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Invitation = require('../models/Invitation');

/**
 * Friend management controller
 * Handles friend requests, acceptances, and friend list management
 */

/**
 * Get user's friends list
 */
const getFriendsList = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const friends = await Friendship.getFriends(userId);
    
    res.json({
      success: true,
      friends: friends,
      total: friends.length
    });

  } catch (error) {
    console.error('Get friends list error:', error);
    res.status(500).json({ error: 'Failed to get friends list' });
  }
};

/**
 * Send friend invitation
 */
const sendFriendInvitation = async (req, res) => {
  try {
    const senderId = req.session.userId;
    const { receiverId, message } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    const alreadyFriends = await Friendship.areFriends(senderId, receiverId);
    if (alreadyFriends) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    const invitationExists = await Invitation.invitationExists(senderId, receiverId);
    if (invitationExists) {
      return res.status(400).json({ error: 'Friend request already sent or received' });
    }

    const invitation = new Invitation({
      sender: senderId,
      receiver: receiverId,
      type: 'friend',
      message: message || ''
    });

    await invitation.save();

    const populatedInvitation = await Invitation.findById(invitation._id)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      invitation: {
        id: populatedInvitation._id,
        sender: populatedInvitation.sender,
        receiver: populatedInvitation.receiver,
        message: populatedInvitation.message,
        createdAt: populatedInvitation.createdAt
      }
    });

  } catch (error) {
    console.error('Send friend invitation error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

/**
 * Get pending friend invitations received
 */
const getReceivedInvitations = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const invitations = await Invitation.getPendingInvitations(userId);
    
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation._id,
      sender: {
        id: invitation.sender._id,
        username: invitation.sender.username,
        avatar: invitation.sender.avatar,
        firstName: invitation.sender.profile?.firstName,
        lastName: invitation.sender.profile?.lastName,
        totalScore: invitation.sender.gameStats?.totalScore || 0
      },
      message: invitation.message,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt
    }));

    res.json({
      success: true,
      invitations: formattedInvitations,
      total: formattedInvitations.length
    });

  } catch (error) {
    console.error('Get received invitations error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
};

/**
 * Get sent friend invitations
 */
const getSentInvitations = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const invitations = await Invitation.getSentInvitations(userId);
    
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation._id,
      receiver: {
        id: invitation.receiver._id,
        username: invitation.receiver.username,
        avatar: invitation.receiver.avatar,
        firstName: invitation.receiver.profile?.firstName,
        lastName: invitation.receiver.profile?.lastName
      },
      message: invitation.message,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt
    }));

    res.json({
      success: true,
      invitations: formattedInvitations,
      total: formattedInvitations.length
    });

  } catch (error) {
    console.error('Get sent invitations error:', error);
    res.status(500).json({ error: 'Failed to get sent friend requests' });
  }
};

/**
 * Accept friend invitation
 */
const acceptFriendInvitation = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.receiver.toString() !== userId) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer pending' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    const alreadyFriends = await Friendship.areFriends(invitation.sender, invitation.receiver);
    if (alreadyFriends) {
      invitation.status = 'accepted';
      await invitation.save();
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    invitation.status = 'accepted';
    await invitation.save();

    // Normalize user IDs (same logic as pre-save hook)
    const userId1 = invitation.sender.toString();
    const userId2 = invitation.receiver.toString();
    const [user1, user2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Check if there's an existing friendship (including deleted ones)
    const existingFriendship = await Friendship.findOne({
      user1: user1,
      user2: user2
    });

    if (existingFriendship) {
      // Reactivate existing friendship
      existingFriendship.status = 'active';
      existingFriendship.createdBy = invitation.sender;
      await existingFriendship.save();
    } else {
      // Create new friendship
      const friendship = new Friendship({
        user1: invitation.sender,
        user2: invitation.receiver,
        createdBy: invitation.sender
      });
      await friendship.save();
    }

    await Invitation.cancelPendingInvitations(invitation.sender, invitation.receiver);

    res.json({
      success: true,
      message: 'Friend request accepted successfully'
    });

  } catch (error) {
    console.error('Accept friend invitation error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
};

/**
 * Decline friend invitation
 */
const declineFriendInvitation = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.receiver.toString() !== userId) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer pending' });
    }

    invitation.status = 'declined';
    await invitation.save();

    res.json({
      success: true,
      message: 'Friend request declined successfully'
    });

  } catch (error) {
    console.error('Decline friend invitation error:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
};

/**
 * Cancel sent friend invitation
 */
const cancelFriendInvitation = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.sender.toString() !== userId) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer pending' });
    }

    invitation.status = 'cancelled';
    await invitation.save();

    res.json({
      success: true,
      message: 'Friend request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel friend invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
};

/**
 * Remove friend
 */
const removeFriend = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { friendId } = req.params;

    if (userId === friendId) {
      return res.status(400).json({ error: 'Cannot remove yourself as friend' });
    }

    const friendship = await Friendship.removeFriendship(userId, friendId);
    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};

/**
 * Check friendship status with another user
 */
const getFriendshipStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { targetUserId } = req.params;

    if (userId === targetUserId) {
      return res.json({
        success: true,
        status: 'self'
      });
    }

    const areFriends = await Friendship.areFriends(userId, targetUserId);
    if (areFriends) {
      return res.json({
        success: true,
        status: 'friends'
      });
    }

    const pendingInvitation = await Invitation.findOne({
      $or: [
        { sender: userId, receiver: targetUserId },
        { sender: targetUserId, receiver: userId }
      ],
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (pendingInvitation) {
      const status = pendingInvitation.sender.toString() === userId 
        ? 'request_sent' 
        : 'request_received';
      
      return res.json({
        success: true,
        status: status,
        invitationId: pendingInvitation._id
      });
    }

    res.json({
      success: true,
      status: 'none'
    });

  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({ error: 'Failed to get friendship status' });
  }
};

/**
 * Get mutual friends with another user
 */
const getMutualFriends = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { userId } = req.params;

    console.log('Getting mutual friends:', { currentUserId, targetUserId: userId });

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get friends of current user
    const currentUserFriends = await Friendship.getFriends(currentUserId);
    console.log('Current user friends count:', currentUserFriends.length);
    const currentUserFriendIds = currentUserFriends.map(f => f.id.toString());

    // Get friends of target user
    const targetUserFriends = await Friendship.getFriends(userId);
    console.log('Target user friends count:', targetUserFriends.length);
    const targetUserFriendIds = targetUserFriends.map(f => f.id.toString());

    // Find intersection
    const mutualFriendIds = currentUserFriendIds.filter(id => 
      targetUserFriendIds.includes(id)
    );
    console.log('Mutual friends count:', mutualFriendIds.length);

    // Get full user details for mutual friends
    const mutualFriends = currentUserFriends.filter(friend => 
      mutualFriendIds.includes(friend.id.toString())
    );

    res.json({
      success: true,
      mutualFriends: mutualFriends,
      count: mutualFriends.length
    });

  } catch (error) {
    console.error('Get mutual friends error:', error);
    res.status(500).json({ error: 'Failed to get mutual friends' });
  }
};

module.exports = {
  getFriendsList,
  sendFriendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  acceptFriendInvitation,
  declineFriendInvitation,
  cancelFriendInvitation,
  removeFriend,
  getFriendshipStatus,
  getMutualFriends
};