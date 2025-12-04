const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const mongoose = require('mongoose');

/**
 * Game controller
 * Handles game creation, matchmaking, and game history
 */

/**
 * Create a new game challenge
 */
const createChallenge = async (req, res) => {
  try {
    const challengerId = req.session.userId;
    const { opponentId, gameType = 'challenge' } = req.body;

    if (!opponentId) {
      return res.status(400).json({ error: 'Opponent ID is required' });
    }

    if (challengerId === opponentId) {
      return res.status(400).json({ error: 'Cannot challenge yourself' });
    }

    const opponent = await User.findById(opponentId);
    if (!opponent || opponent.status !== 'active') {
      return res.status(404).json({ error: 'Opponent not found' });
    }

    const areFriends = await Friendship.areFriends(challengerId, opponentId);
    if (!areFriends) {
      return res.status(400).json({ error: 'Can only challenge friends' });
    }

    const activeGame = await Game.findActiveGameForUser(challengerId);
    if (activeGame) {
      return res.status(400).json({ error: 'You are already in an active game' });
    }

    const opponentActiveGame = await Game.findActiveGameForUser(opponentId);
    if (opponentActiveGame) {
      return res.status(400).json({ error: 'Opponent is already in an active game' });
    }

    const goalTime = Game.generateGoalTime();
    
    const game = new Game({
      player1: challengerId,
      player2: opponentId,
      goalTime: goalTime,
      gameType: gameType,
      status: 'waiting',
      totalRounds: 3,
      currentRound: 1
    });

    await game.save();
    
    const populatedGame = await Game.findById(game._id)
      .populate('player1', 'username avatar')
      .populate('player2', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Game challenge created successfully',
      game: {
        id: populatedGame._id,
        player1: populatedGame.player1,
        player2: populatedGame.player2,
        goalTime: populatedGame.goalTime,
        gameType: populatedGame.gameType,
        status: populatedGame.status,
        createdAt: populatedGame.createdAt
      }
    });

  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Failed to create game challenge' });
  }
};

/**
 * Get user's game history
 */
const getGameHistory = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { page = 1, limit = 10, status = 'finished' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const games = await Game.find({
      $or: [
        { player1: userId },
        { player2: userId }
      ],
      status: status
    })
    .populate('player1', 'username avatar')
    .populate('player2', 'username avatar')
    .populate('winner', 'username avatar')
    .populate('rounds.winner', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Game.countDocuments({
      $or: [
        { player1: userId },
        { player2: userId }
      ],
      status: status
    });

    const formattedGames = games.map(game => ({
      id: game._id,
      player1: game.player1,
      player2: game.player2,
      winner: game.winner,
      goalTime: game.goalTime,
      player1Time: game.player1Time,
      player2Time: game.player2Time,
      result: game.getResultForPlayer(userId),
      gameType: game.gameType,
      duration: game.gameEndedAt ? game.gameEndedAt - game.gameStartedAt : null,
      rounds: game.rounds || [],
      createdAt: game.createdAt,
      completedAt: game.gameEndedAt
    }));

    res.json({
      success: true,
      games: formattedGames,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: formattedGames.length,
        totalGames: total
      }
    });

  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Failed to get game history' });
  }
};

/**
 * Get specific game details
 */
const getGameDetails = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.session.userId;

    const game = await Game.findById(gameId)
      .populate('player1', 'username avatar profile.firstName profile.lastName gameStats')
      .populate('player2', 'username avatar profile.firstName profile.lastName gameStats')
      .populate('winner', 'username avatar');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const isPlayer = game.player1._id.toString() === userId || 
                    game.player2._id.toString() === userId;
    
    if (!isPlayer) {
      return res.status(403).json({ error: 'Access denied to this game' });
    }

    const gameSession = await GameSession.findOne({ gameId: gameId });

    res.json({
      success: true,
      game: {
        id: game._id,
        player1: game.player1,
        player2: game.player2,
        winner: game.winner,
        goalTime: game.goalTime,
        player1Time: game.player1Time,
        player2Time: game.player2Time,
        player1ClickTime: game.player1ClickTime,
        player2ClickTime: game.player2ClickTime,
        result: game.getResultForPlayer(userId),
        status: game.status,
        gameType: game.gameType,
        settings: game.settings,
        duration: game.gameEndedAt ? game.gameEndedAt - game.gameStartedAt : null,
        createdAt: game.createdAt,
        startedAt: game.gameStartedAt,
        completedAt: game.gameEndedAt
      },
      session: gameSession ? {
        gameState: gameSession.gameState,
        player1Connected: gameSession.player1Connected,
        player2Connected: gameSession.player2Connected
      } : null
    });

  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({ error: 'Failed to get game details' });
  }
};

/**
 * Get user's active game
 */
const getActiveGame = async (req, res) => {
  try {
    const userId = req.session.userId;

    const activeGame = await Game.findActiveGameForUser(userId);
    
    if (!activeGame) {
      return res.json({
        success: true,
        activeGame: null
      });
    }

    const populatedGame = await Game.findById(activeGame._id)
      .populate('player1', 'username avatar')
      .populate('player2', 'username avatar');

    const gameSession = await GameSession.findOne({ gameId: activeGame._id });

    res.json({
      success: true,
      activeGame: {
        id: populatedGame._id,
        player1: populatedGame.player1,
        player2: populatedGame.player2,
        goalTime: populatedGame.goalTime,
        status: populatedGame.status,
        gameType: populatedGame.gameType,
        createdAt: populatedGame.createdAt
      },
      session: gameSession ? {
        gameState: gameSession.gameState,
        player1Connected: gameSession.player1Connected,
        player2Connected: gameSession.player2Connected
      } : null
    });

  } catch (error) {
    console.error('Get active game error:', error);
    res.status(500).json({ error: 'Failed to get active game' });
  }
};

/**
 * Cancel/forfeit a game
 */
const cancelGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.session.userId;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const isPlayer = game.player1.toString() === userId || 
                    game.player2.toString() === userId;
    
    if (!isPlayer) {
      return res.status(403).json({ error: 'Access denied to this game' });
    }

    if (!['waiting', 'starting', 'active'].includes(game.status)) {
      return res.status(400).json({ error: 'Game cannot be cancelled in current state' });
    }

    game.status = 'cancelled';
    game.gameEndedAt = new Date();

    if (game.status === 'active') {
      const opponent = game.player1.toString() === userId ? game.player2 : game.player1;
      game.winner = opponent;
    }

    await game.save();

    const gameSession = await GameSession.findOne({ gameId });
    if (gameSession) {
      gameSession.gameState = 'finished';
      await gameSession.save();
    }

    res.json({
      success: true,
      message: 'Game cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel game error:', error);
    res.status(500).json({ error: 'Failed to cancel game' });
  }
};

/**
 * Get user game statistics
 */
const getUserGameStats = async (req, res) => {
  try {
    const userId = req.session.userId;

    const stats = await Game.getUserGameStats(userId);
    
    const recentGames = await Game.find({
      $or: [
        { player1: userId },
        { player2: userId }
      ],
      status: 'finished'
    })
    .populate('player1', 'username avatar')
    .populate('player2', 'username avatar')
    .populate('winner', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(5);

    const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalGames: stats.totalGames,
        wins: stats.wins,
        losses: stats.totalGames - stats.wins,
        winRate: winRate,
        averageTime: Math.round(stats.averageTime || 0),
        bestAccuracy: stats.bestTime,
        recentGames: recentGames.map(game => ({
          id: game._id,
          opponent: game.player1._id.toString() === userId ? game.player2 : game.player1,
          result: game.getResultForPlayer(userId),
          goalTime: game.goalTime,
          yourTime: game.player1._id.toString() === userId ? game.player1Time : game.player2Time,
          completedAt: game.gameEndedAt
        }))
      }
    });

  } catch (error) {
    console.error('Get user game stats error:', error);
    res.status(500).json({ error: 'Failed to get game statistics' });
  }
};

/**
 * Get leaderboard (legacy - now returns all players)
 */
const getLeaderboard = async (req, res) => {
  try {
    const { type = 'wins', limit = 100 } = req.query;
    
    console.log('[LEADERBOARD] Fetching leaderboard, type:', type, 'limit:', limit);
    
    let sortField;
    switch (type) {
      case 'wins':
        sortField = { 'gameStats.gamesWon': -1 };
        break;
      case 'accuracy':
        sortField = { 'gameStats.bestTime': 1 };
        break;
      case 'games':
        sortField = { 'gameStats.gamesPlayed': -1 };
        break;
      default:
        sortField = { 'gameStats.gamesWon': -1 };
    }

    const users = await User.find({
      status: 'active',
      'gameStats.gamesPlayed': { $gt: 0 }
    })
    .select('username avatar gameStats profile.firstName profile.lastName')
    .sort(sortField)
    .limit(parseInt(limit));

    console.log('[LEADERBOARD] Found', users.length, 'users with games played');

    const leaderboard = users.map((user, index) => {
      const stats = {
        gamesPlayed: user.gameStats.gamesPlayed || 0,
        gamesWon: user.gameStats.gamesWon || 0,
        winRate: user.gameStats.gamesPlayed > 0 ? 
          Math.round((user.gameStats.gamesWon / user.gameStats.gamesPlayed) * 100) : 0,
        bestAccuracy: user.gameStats.bestTime,
        totalScore: user.gameStats.totalScore || 0
      };
      
      return {
        rank: index + 1,
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        stats: stats
      };
    });

    console.log('[LEADERBOARD] Returning', leaderboard.length, 'players');
    if (leaderboard.length > 0) {
      console.log('[LEADERBOARD] Top player:', leaderboard[0].username, 'with', leaderboard[0].stats.gamesWon, 'wins');
    }

    res.json({
      success: true,
      leaderboard: leaderboard,
      type: type,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

/**
 * Get friends ranking (only user and their friends)
 */
const getFriendsRanking = async (req, res) => {
  try {
    const userId = req.userId || req.session?.userId;
    const { type = 'wins' } = req.query;
    
    console.log('[FRIENDS-RANKING] Fetching friends ranking for user:', userId);
    
    // Convert userId to ObjectId if it's a string
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    // Get user's friends
    const Friendship = require('../models/Friendship');
    const friends = await Friendship.getFriends(userObjectId);
    const friendIds = friends.map(f => new mongoose.Types.ObjectId(f.id)); // f.id not f._id
    
    // Include the current user in the list
    friendIds.push(userObjectId);
    
    console.log('[FRIENDS-RANKING] Total users to rank:', friendIds.length);
    console.log('[FRIENDS-RANKING] Friend IDs:', friendIds.map(id => id.toString()));
    
    let sortField;
    switch (type) {
      case 'wins':
        sortField = { 'gameStats.gamesWon': -1 };
        break;
      case 'accuracy':
        sortField = { 'gameStats.bestTime': 1 };
        break;
      case 'games':
        sortField = { 'gameStats.gamesPlayed': -1 };
        break;
      default:
        sortField = { 'gameStats.gamesWon': -1 };
    }

    const users = await User.find({
      _id: { $in: friendIds },
      status: 'active'
    })
    .select('username avatar gameStats profile.firstName profile.lastName')
    .sort(sortField);

    const leaderboard = users.map((user, index) => {
      const stats = {
        gamesPlayed: user.gameStats.gamesPlayed || 0,
        gamesWon: user.gameStats.gamesWon || 0,
        winRate: user.gameStats.gamesPlayed > 0 ? 
          Math.round((user.gameStats.gamesWon / user.gameStats.gamesPlayed) * 100) : 0,
        bestAccuracy: user.gameStats.bestTime,
        totalScore: user.gameStats.totalScore || 0
      };
      
      return {
        rank: index + 1,
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        stats: stats,
        isCurrentUser: user._id.toString() === userId
      };
    });

    console.log('[FRIENDS-RANKING] Returning', leaderboard.length, 'players');

    res.json({
      success: true,
      leaderboard: leaderboard,
      type: type,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get friends ranking error:', error);
    res.status(500).json({ error: 'Failed to get friends ranking' });
  }
};

/**
 * Get top players (public - top 5 players globally)
 */
const getTopPlayers = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    console.log('[TOP-PLAYERS] Fetching top', limit, 'players');
    
    const users = await User.find({
      status: 'active',
      'gameStats.gamesPlayed': { $gt: 0 }
    })
    .select('username avatar gameStats profile.firstName profile.lastName')
    .sort({ 'gameStats.gamesWon': -1 })
    .limit(parseInt(limit));

    const topPlayers = users.map((user, index) => {
      const stats = {
        gamesPlayed: user.gameStats.gamesPlayed || 0,
        gamesWon: user.gameStats.gamesWon || 0,
        winRate: user.gameStats.gamesPlayed > 0 ? 
          Math.round((user.gameStats.gamesWon / user.gameStats.gamesPlayed) * 100) : 0,
        bestAccuracy: user.gameStats.bestTime,
        totalScore: user.gameStats.totalScore || 0
      };
      
      return {
        rank: index + 1,
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        stats: stats
      };
    });

    console.log('[TOP-PLAYERS] Returning', topPlayers.length, 'players');

    res.json({
      success: true,
      topPlayers: topPlayers,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get top players error:', error);
    res.status(500).json({ error: 'Failed to get top players' });
  }
};

/**
 * Force end a game (when player closes window)
 */
const forceEndGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.session.userId;

    console.log(`[GAME] Force ending game ${gameId} by user ${userId}`);

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user is part of the game
    const isPlayer = game.player1.toString() === userId || game.player2.toString() === userId;
    if (!isPlayer) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Only cancel if not finished
    if (game.status !== 'finished' && game.status !== 'cancelled') {
      game.status = 'cancelled';
      game.gameEndedAt = new Date();
      game.cancelReason = 'player_left';
      await game.save();
      console.log(`[GAME] Game ${gameId} force cancelled`);
    }

    // Cleanup session
    await GameSession.findOneAndDelete({ gameId: gameId });

    res.json({ success: true, message: 'Game ended' });
  } catch (error) {
    console.error('Force end game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
};

/**
 * Clean up waiting games for a user
 */
const cleanupWaitingGames = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Cancel all waiting games where user is player1 (sender)
    // BUT do NOT cancel guest_challenge games (they have player1=null and different lifecycle)
    const result = await Game.updateMany(
      {
        player1: userId,
        status: 'waiting',
        gameType: { $ne: 'guest_challenge' }
      },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'cleanup'
      }
    );

    res.json({
      success: true,
      message: 'Waiting games cleaned up',
      count: result.modifiedCount
    });

  } catch (error) {
    console.error('Cleanup waiting games error:', error);
    res.status(500).json({ error: 'Failed to cleanup waiting games' });
  }
};

/**
 * Debug: Get user's current game status
 */
const getUserGamesStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    const GameSession = require('../models/GameSession');

    const allGames = await Game.find({
      $or: [
        { player1: userId },
        { player2: userId }
      ]
    }).sort({ updatedAt: -1 }).limit(10);

    const gamesWithSessions = await Promise.all(allGames.map(async (game) => {
      const session = await GameSession.findOne({ gameId: game._id });
      return {
        id: game._id,
        status: game.status,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        hasSession: !!session,
        sessionState: session?.gameState || null,
        connectedPlayers: session?.getConnectedPlayersCount() || 0
      };
    }));

    res.json({
      success: true,
      userId: userId,
      games: gamesWithSessions
    });

  } catch (error) {
    console.error('Get user games status error:', error);
    res.status(500).json({ error: 'Failed to get games status' });
  }
};

/**
 * Force cleanup all active games for user (emergency cleanup)
 */
const forceCleanupActiveGames = async (req, res) => {
  try {
    const userId = req.session.userId;
    const GameSession = require('../models/GameSession');

    console.log(`[CLEANUP] Force cleanup for user ${userId}`);

    // Only cleanup games that haven't been updated in the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000);

    // Find all active/starting games for this user that are old
    const activeGames = await Game.find({
      $or: [
        { player1: userId },
        { player2: userId }
      ],
      status: { $in: ['waiting', 'starting', 'active'] },
      updatedAt: { $lt: thirtySecondsAgo }
    });

    console.log(`[CLEANUP] Found ${activeGames.length} stale games (older than 30s)`);

    let cancelled = 0;
    for (const game of activeGames) {
      // Double check: only cancel if no active session
      const gameSession = await GameSession.findOne({ gameId: game._id });
      
      if (!gameSession || gameSession.getConnectedPlayersCount() === 0) {
        game.status = 'cancelled';
        game.gameEndedAt = new Date();
        game.cancelReason = 'force_cleanup_stale';
        await game.save();
        
        // Clean up game session if exists
        if (gameSession) {
          await GameSession.findByIdAndDelete(gameSession._id);
        }
        
        cancelled++;
        console.log(`[CLEANUP] Cancelled stale game ${game._id}`);
      } else {
        console.log(`[CLEANUP] Skipped game ${game._id} - has active session with ${gameSession.getConnectedPlayersCount()} players`);
      }
    }

    res.json({
      success: true,
      message: 'Stale games force cleaned',
      gamesFound: activeGames.length,
      gamesCancelled: cancelled
    });

  } catch (error) {
    console.error('Force cleanup error:', error);
    res.status(500).json({ error: 'Failed to force cleanup games' });
  }
};

/**
 * Create a guest challenge - guest user challenges random ONLINE player
 */
const createGuestChallenge = async (req, res) => {
  try {
    console.log('[GUEST CHALLENGE] Starting guest challenge request...');
    const nodemailer = require('nodemailer');
    
    // Get socket manager to check online users
    const socketManager = req.app.get('socketManager');
    if (!socketManager) {
      return res.status(500).json({ error: 'Socket system not available' });
    }

    // Get all ONLINE users
    const onlineUsers = socketManager.getOnlineUsers();
    console.log('[GUEST CHALLENGE] Total online users:', onlineUsers.length);
    console.log('[GUEST CHALLENGE] Online users:', onlineUsers.map(u => ({ username: u.username, userId: u.userId })));

    if (onlineUsers.length === 0) {
      return res.json({
        success: false,
        message: 'No players online at the moment'
      });
    }

    // Filter to only ONLINE logged-in users who are free (not in game)
    const availablePlayers = [];
    
    for (const userData of onlineUsers) {
      if (!userData.userId) continue; // Skip guests or invalid users
      
      // Check if user has active game
      const activeGame = await Game.findActiveGameForUser(userData.userId);
      console.log(`[GUEST CHALLENGE] User ${userData.username} - Active game:`, activeGame ? 'YES' : 'NO');
      
      if (!activeGame) {
        // Get full user data including email
        const user = await User.findById(userData.userId).select('username email');
        if (user && user.email) {
          availablePlayers.push({
            id: user._id,
            username: user.username,
            email: user.email
          });
        }
      }
    }

    console.log('[GUEST CHALLENGE] Available online players (not in game):', availablePlayers.length);
    console.log('[GUEST CHALLENGE] Available players list:', availablePlayers.map(p => p.username));

    if (availablePlayers.length === 0) {
      return res.json({
        success: false,
        message: 'All online players are currently in games. Try again later.'
      });
    }

    // Select random player
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const selectedPlayer = availablePlayers[randomIndex];

    console.log('[GUEST CHALLENGE] Selected player:', selectedPlayer.username);

    // Create game with guest as player1 (no user ID)
    const goalTime = Game.generateGoalTime();
    
    const game = new Game({
      player1: null, // Guest user (no ID)
      player2: selectedPlayer.id,
      status: 'waiting',
      gameType: 'guest_challenge',
      goalTime: goalTime,
      totalRounds: 3,
      createdAt: new Date()
    });

    await game.save();

    console.log('[GUEST CHALLENGE] Game created:', game._id);

    // Send email to selected player
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'alphonso77@ethereal.email',
        pass: 'd3dsT2xAxPjvgep2r6'
      }
    });

    const mailOptions = {
      from: '"TimeoutClick" <noreply@timeoutclick.com>',
      to: selectedPlayer.email,
      subject: 'New Challenge from Guest Player',
      text: `Hi ${selectedPlayer.username},\n\nA guest player has challenged you to a duel in TimeoutClick!\n\nClick here to accept: http://localhost:5000/pages/login.html?redirect=challenge&gameId=${game._id}\n\nGood luck!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Challenge!</h2>
          <p>Hi <strong>${selectedPlayer.username}</strong>,</p>
          <p>A guest player has challenged you to a duel in TimeoutClick!</p>
          <p style="margin: 30px 0;">
            <a href="http://localhost:5000/pages/login.html?redirect=challenge&gameId=${game._id}" 
               style="background: #D2691E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Challenge
            </a>
          </p>
          <p>Good luck!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
          <p style="font-size: 12px; color: #666;">TimeoutClick - Test your timing skills</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('[GUEST CHALLENGE] Email sent:', info.messageId);
    console.log('[GUEST CHALLENGE] Preview URL:', nodemailer.getTestMessageUrl(info));

    res.json({
      success: true,
      message: `Challenge sent to ${selectedPlayer.username}`,
      gameId: game._id,
      opponent: selectedPlayer.username,
      emailPreview: nodemailer.getTestMessageUrl(info)
    });

  } catch (error) {
    console.error('[GUEST CHALLENGE] Error:', error);
    res.status(500).json({ error: 'Failed to create guest challenge' });
  }
};

module.exports = {
  createChallenge,
  createGuestChallenge,
  getGameHistory,
  getGameDetails,
  getActiveGame,
  cancelGame,
  forceEndGame,
  cleanupWaitingGames,
  forceCleanupActiveGames,
  getUserGamesStatus,
  getUserGameStats,
  getLeaderboard,
  getFriendsRanking,
  getTopPlayers
};