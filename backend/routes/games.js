const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createChallenge,
  getGameHistory,
  getGameDetails,
  getActiveGame,
  cancelGame,
  cleanupWaitingGames,
  forceCleanupActiveGames,
  getUserGamesStatus,
  getUserGameStats,
  getLeaderboard
} = require('../controllers/gameController');

/**
 * Game management routes
 * All routes are prefixed with /api/games
 */

/**
 * @route   POST /api/games/challenge
 * @desc    Create a new game challenge
 * @access  Private
 */
router.post('/challenge', requireAuth, createChallenge);

/**
 * @route   POST /api/games/cleanup
 * @desc    Clean up old waiting games
 * @access  Private
 */
router.post('/cleanup', requireAuth, cleanupWaitingGames);

/**
 * @route   POST /api/games/force-cleanup
 * @desc    Force cleanup all active games for user (emergency)
 * @access  Private
 */
router.post('/force-cleanup', requireAuth, forceCleanupActiveGames);

/**
 * @route   GET /api/games/debug-status
 * @desc    Get debug info about user's games
 * @access  Private
 */
router.get('/debug-status', requireAuth, getUserGamesStatus);

/**
 * @route   GET /api/games/active
 * @desc    Get user's current active game
 * @access  Private
 */
router.get('/active', requireAuth, getActiveGame);

/**
 * @route   GET /api/games/history
 * @desc    Get user's game history with pagination
 * @access  Private
 */
router.get('/history', requireAuth, getGameHistory);

/**
 * @route   GET /api/games/stats
 * @desc    Get user's game statistics
 * @access  Private
 */
router.get('/stats', requireAuth, getUserGameStats);

/**
 * @route   GET /api/games/leaderboard
 * @desc    Get game leaderboard
 * @access  Private
 */
router.get('/leaderboard', requireAuth, getLeaderboard);

/**
 * @route   GET /api/games/:gameId
 * @desc    Get specific game details
 * @access  Private
 */
router.get('/:gameId', requireAuth, getGameDetails);

/**
 * @route   PUT /api/games/:gameId/cancel
 * @desc    Cancel/forfeit a game
 * @access  Private
 */
router.put('/:gameId/cancel', requireAuth, cancelGame);

module.exports = router;