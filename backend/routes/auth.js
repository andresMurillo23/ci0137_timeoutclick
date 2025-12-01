const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');

/**
 * Authentication routes
 * All routes are prefixed with /api/auth
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and create session
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
router.post('/logout', requireAuth, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', requireAuth, getCurrentUser);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPassword);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address with token
 * @access  Public
 */
router.post('/verify-email', verifyEmail);

/**
 * @route   GET /api/auth/check
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/check', optionalAuth, (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated,
    userId: req.userId || null
  });
});

module.exports = router;