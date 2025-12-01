const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getFriendsList,
  sendFriendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  acceptFriendInvitation,
  declineFriendInvitation,
  cancelFriendInvitation,
  removeFriend,
  getFriendshipStatus
} = require('../controllers/friendController');

/**
 * Friend management routes
 * All routes are prefixed with /api/friends
 */

/**
 * @route   GET /api/friends
 * @desc    Get user's friends list
 * @access  Private
 */
router.get('/', requireAuth, getFriendsList);

/**
 * @route   POST /api/friends/invite
 * @desc    Send friend invitation
 * @access  Private
 */
router.post('/invite', requireAuth, sendFriendInvitation);

/**
 * @route   GET /api/friends/invitations/received
 * @desc    Get received friend invitations
 * @access  Private
 */
router.get('/invitations/received', requireAuth, getReceivedInvitations);

/**
 * @route   GET /api/friends/invitations/sent
 * @desc    Get sent friend invitations
 * @access  Private
 */
router.get('/invitations/sent', requireAuth, getSentInvitations);

/**
 * @route   PUT /api/friends/invitations/:invitationId/accept
 * @desc    Accept friend invitation
 * @access  Private
 */
router.put('/invitations/:invitationId/accept', requireAuth, acceptFriendInvitation);

/**
 * @route   PUT /api/friends/invitations/:invitationId/decline
 * @desc    Decline friend invitation
 * @access  Private
 */
router.put('/invitations/:invitationId/decline', requireAuth, declineFriendInvitation);

/**
 * @route   DELETE /api/friends/invitations/:invitationId
 * @desc    Cancel sent friend invitation
 * @access  Private
 */
router.delete('/invitations/:invitationId', requireAuth, cancelFriendInvitation);

/**
 * @route   DELETE /api/friends/:friendId
 * @desc    Remove friend
 * @access  Private
 */
router.delete('/:friendId', requireAuth, removeFriend);

/**
 * @route   GET /api/friends/status/:targetUserId
 * @desc    Check friendship status with another user
 * @access  Private
 */
router.get('/status/:targetUserId', requireAuth, getFriendshipStatus);

module.exports = router;