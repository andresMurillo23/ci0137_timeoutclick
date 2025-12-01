const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { handleAvatarUpload, validateUserAuth } = require('../middleware/upload');
const {
  validateProfileUpdate,
  validateSettingsUpdate,
  validatePasswordChange,
  validateSearch
} = require('../middleware/validation');
const {
  getUserProfile,
  updateProfile,
  updateSettings,
  uploadAvatar,
  changePassword,
  deleteAccount,
  searchUsers,
  getUserStats
} = require('../controllers/userController');

/**
 * User management routes
 * All routes are prefixed with /api/users
 */

/**
 * @route   GET /api/users/search
 * @desc    Search users by username
 * @access  Private
 */
router.get('/search', requireAuth, validateSearch, searchUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get('/:id', requireAuth, getUserProfile);

/**
 * @route   GET /api/users/:id/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/:id/stats', requireAuth, getUserStats);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', requireAuth, validateProfileUpdate, updateProfile);

/**
 * @route   PUT /api/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings', requireAuth, validateSettingsUpdate, updateSettings);

/**
 * @route   POST /api/users/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar', validateUserAuth, handleAvatarUpload, uploadAvatar);

/**
 * @route   PUT /api/users/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/password', requireAuth, validatePasswordChange, changePassword);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', requireAuth, deleteAccount);

module.exports = router;