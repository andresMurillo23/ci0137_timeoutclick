const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const path = require('path');
const fs = require('fs').promises;

/**
 * User management controller
 * Handles user profiles, settings, and data management
 */

/**
 * Get user profile by ID
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        profile: user.profile,
        gameStats: user.gameStats,
        winRate: user.winRate,
        lastActive: user.lastActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

/**
 * Update current user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { username, email, firstName, lastName, dateOfBirth, country } = req.body;

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username.toLowerCase().trim();
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already taken' });
      }
      user.email = email.toLowerCase().trim();
      user.isEmailVerified = false; // Reset verification if email changes
    }

    // Update profile fields
    if (firstName !== undefined) user.profile.firstName = firstName.trim();
    if (lastName !== undefined) user.profile.lastName = lastName.trim();
    if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (country !== undefined) user.profile.country = country.trim();

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        profile: user.profile,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Update user settings
 */
const updateSettings = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { notifications, soundEnabled, theme } = req.body;

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (notifications !== undefined) user.settings.notifications = notifications;
    if (soundEnabled !== undefined) user.settings.soundEnabled = soundEnabled;
    if (theme !== undefined && ['light', 'dark'].includes(theme)) {
      user.settings.theme = theme;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

/**
 * Upload user avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.avatar) {
      try {
        await fs.unlink(path.join(process.env.UPLOAD_PATH || './uploads', user.avatar));
      } catch (error) {
        console.warn('Failed to delete old avatar:', error.message);
      }
    }

    const avatarPath = `avatars/${req.file.filename}`;
    user.avatar = avatarPath;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: avatarPath
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    user.status = 'inactive';
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.username = `deleted_${Date.now()}_${user.username}`;
    await user.save();

    req.session.destroy((error) => {
      if (error) {
        console.error('Session destroy error:', error);
      }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

/**
 * Search users by username
 */
const searchUsers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const userId = req.session.userId;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const users = await User.find({
      username: searchRegex,
      status: 'active',
      _id: { $ne: userId }
    })
    .select('username avatar profile.firstName profile.lastName gameStats createdAt')
    .limit(parseInt(limit))
    .sort({ 'gameStats.totalScore': -1 });

    const results = users.map(user => ({
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      totalScore: user.gameStats.totalScore,
      gamesPlayed: user.gameStats.gamesPlayed,
      winRate: user.winRate,
      joinDate: user.createdAt
    }));

    res.json({
      success: true,
      users: results,
      total: results.length
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

/**
 * Get user statistics
 */
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('username avatar gameStats createdAt status');
    
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found' });
    }
    // Normalize and sanitize stats to avoid negative values or >100% winRate
    const gp = Number(user.gameStats?.gamesPlayed || 0);
    let gw = Number(user.gameStats?.gamesWon || 0);

    if (gw < 0) gw = 0;
    if (gw > gp) gw = gp;

    const gamesLost = Math.max(0, gp - gw);
    const winRate = gp > 0 ? Math.round((gw / gp) * 100) : 0;

    res.json({
      success: true,
      stats: {
        username: user.username,
        avatar: user.avatar,
        gamesPlayed: gp,
        gamesWon: gw,
        gamesLost: gamesLost,
        totalScore: user.gameStats?.totalScore || 0,
        bestTime: user.gameStats?.bestTime || null,
        averageTime: user.gameStats?.averageTime || null,
        winRate: winRate,
        memberSince: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
};

/**
 * Get suggested users to add as friends
 * Excludes current friends and pending invitations
 */
const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { limit = 20 } = req.query;

    // Import Friendship and Invitation models
    const Friendship = require('../models/Friendship');
    const Invitation = require('../models/Invitation');

    // Get current friends
    const friendships = await Friendship.find({
      $or: [
        { user1: userId, status: 'active' },
        { user2: userId, status: 'active' }
      ]
    });

    const friendIds = friendships.map(f => 
      f.user1.toString() === userId.toString() ? f.user2.toString() : f.user1.toString()
    );

    // Get pending invitations (sent or received)
    const invitations = await Invitation.find({
      $or: [
        { sender: userId, status: 'pending' },
        { receiver: userId, status: 'pending' }
      ]
    });

    const pendingUserIds = invitations.map(inv => 
      inv.sender.toString() === userId.toString() ? inv.receiver.toString() : inv.sender.toString()
    );

    // Combine all IDs to exclude
    const excludeIds = [userId, ...friendIds, ...pendingUserIds];

    // Get suggested users
    const users = await User.find({
      _id: { $nin: excludeIds },
      status: 'active'
    })
    .select('username avatar profile.firstName profile.lastName gameStats createdAt')
    .limit(parseInt(limit))
    .sort({ 'gameStats.totalScore': -1 });

    const results = users.map(user => ({
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      totalScore: user.gameStats.totalScore,
      gamesPlayed: user.gameStats.gamesPlayed,
      winRate: user.winRate,
      joinDate: user.createdAt
    }));

    res.json({
      success: true,
      users: results,
      total: results.length
    });

  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ error: 'Failed to get suggested users' });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  updateSettings,
  uploadAvatar,
  changePassword,
  deleteAccount,
  searchUsers,
  getUserStats,
  getSuggestedUsers
};