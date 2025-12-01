const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const User = require('../models/User');

/**
 * Socket.IO game event handlers
 * Manages real-time TimeoutClick gameplay
 */

class GameSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map();
    this.playerSockets = new Map();
  }

  /**
   * Initialize game socket events
   */
  initializeEvents(socket) {
    socket.on('join_game', (data) => this.handleJoinGame(socket, data));
    socket.on('player_ready', (data) => this.handlePlayerReady(socket, data));
    socket.on('player_click', (data) => this.handlePlayerClick(socket, data));
    socket.on('leave_game', (data) => this.handleLeaveGame(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Handle player joining a game
   */
  async handleJoinGame(socket, data) {
    try {
      const { gameId } = data;
      const userId = socket.request.session?.userId;

      if (!userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const game = await Game.findById(gameId).populate('player1 player2');
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const isPlayer = game.player1._id.toString() === userId || 
                      game.player2._id.toString() === userId;
      
      if (!isPlayer) {
        socket.emit('error', { message: 'You are not part of this game' });
        return;
      }

      let gameSession = await GameSession.findOne({ gameId: gameId });
      if (!gameSession) {
        gameSession = new GameSession({
          gameId: gameId,
          gameState: 'waiting_players'
        });
      }

      gameSession.setPlayerConnection(userId, socket.id, true);
      await gameSession.save();

      socket.join(`game_${gameId}`);
      this.playerSockets.set(socket.id, { userId, gameId, gameSession });

      socket.emit('game_joined', {
        gameId: gameId,
        playerRole: game.player1._id.toString() === userId ? 'player1' : 'player2',
        game: {
          id: game._id,
          player1: {
            id: game.player1._id,
            username: game.player1.username,
            avatar: game.player1.avatar
          },
          player2: {
            id: game.player2._id,
            username: game.player2.username,
            avatar: game.player2.avatar
          },
          status: game.status,
          goalTime: game.goalTime
        },
        session: {
          player1Connected: gameSession.player1Connected,
          player2Connected: gameSession.player2Connected,
          gameState: gameSession.gameState
        }
      });

      if (gameSession.areBothPlayersConnected() && game.status === 'waiting') {
        await this.startGameCountdown(gameId);
      }

      this.io.to(`game_${gameId}`).emit('player_connection_update', {
        player1Connected: gameSession.player1Connected,
        player2Connected: gameSession.player2Connected,
        connectedCount: gameSession.getConnectedPlayersCount()
      });

    } catch (error) {
      console.error('Join game error:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  }

  /**
   * Start game countdown
   */
  async startGameCountdown(gameId) {
    try {
      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) return;

      game.status = 'starting';
      gameSession.gameState = 'countdown';
      gameSession.countdownStartedAt = new Date();

      await game.save();
      await gameSession.save();

      this.io.to(`game_${gameId}`).emit('game_countdown_start', {
        countdownTime: game.settings.countdownTime,
        goalTime: game.goalTime,
        startTime: gameSession.countdownStartedAt
      });

      setTimeout(async () => {
        await this.startGameplay(gameId);
      }, game.settings.countdownTime);

    } catch (error) {
      console.error('Start countdown error:', error);
    }
  }

  /**
   * Start actual gameplay
   */
  async startGameplay(gameId) {
    try {
      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) return;

      game.status = 'active';
      game.gameStartedAt = new Date();
      gameSession.gameState = 'playing';
      gameSession.gameStartedAt = new Date();

      await game.save();
      await gameSession.save();

      this.io.to(`game_${gameId}`).emit('game_start', {
        gameStartTime: gameSession.gameStartedAt,
        goalTime: game.goalTime,
        message: 'Game started! Click STOP when you think you\'ve reached the goal time!'
      });

      // Emit goal time separately for frontend compatibility
      this.io.to(`game_${gameId}`).emit('goal_time_set', {
        goalTime: game.goalTime
      });

    } catch (error) {
      console.error('Start gameplay error:', error);
    }
  }

  /**
   * Handle player click (stop button)
   */
  async handlePlayerClick(socket, data) {
    try {
      const playerData = this.playerSockets.get(socket.id);
      if (!playerData) {
        socket.emit('error', { message: 'Player not found in active games' });
        return;
      }

      const { userId, gameId } = playerData;
      const clickTime = new Date();

      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession || gameSession.gameState !== 'playing') {
        socket.emit('error', { message: 'Game is not in playing state' });
        return;
      }

      const wasFirstToClick = await gameSession.setRaceLock(userId);
      if (!wasFirstToClick && gameSession.raceWinner.toString() !== userId) {
        socket.emit('click_rejected', { 
          message: 'Another player clicked first',
          winner: gameSession.raceWinner
        });
        return;
      }

      const timeDifference = clickTime - gameSession.gameStartedAt;
      
      const isPlayer1 = game.player1.toString() === userId;
      if (isPlayer1) {
        game.player1Time = timeDifference;
        game.player1ClickTime = clickTime;
      } else {
        game.player2Time = timeDifference;
        game.player2ClickTime = clickTime;
      }

      await game.save();

      socket.emit('click_registered', {
        playerId: userId,
        clickTime: timeDifference,
        goalTime: game.goalTime,
        difference: Math.abs(timeDifference - game.goalTime)
      });

      // Emit player_clicked event for frontend compatibility
      this.io.to(`game_${gameId}`).emit('player_clicked', {
        playerId: userId,
        clickTime: timeDifference,
        goalTime: game.goalTime,
        difference: Math.abs(timeDifference - game.goalTime)
      });

      const opponentSocketId = gameSession.getOpponentSocketId(socket.id);
      if (opponentSocketId) {
        this.io.to(opponentSocketId).emit('opponent_clicked', {
          opponentTime: timeDifference,
          goalTime: game.goalTime
        });
      }

      if (game.isComplete()) {
        await this.finishGame(gameId);
      }

    } catch (error) {
      console.error('Handle player click error:', error);
      socket.emit('error', { message: 'Failed to register click' });
    }
  }

  /**
   * Finish the game and determine winner
   */
  async finishGame(gameId) {
    try {
      const game = await Game.findById(gameId).populate('player1 player2');
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) return;

      const winner = game.calculateWinner();
      game.winner = winner;
      game.status = 'finished';
      game.gameEndedAt = new Date();

      gameSession.gameState = 'finished';

      await game.save();
      await gameSession.save();

      await this.updatePlayerStats(game);

      const gameResult = {
        gameId: gameId,
        goalTime: game.goalTime,
        player1: {
          id: game.player1._id,
          username: game.player1.username,
          time: game.player1Time,
          difference: game.player1Time ? Math.abs(game.player1Time - game.goalTime) : null
        },
        player2: {
          id: game.player2._id,
          username: game.player2.username,
          time: game.player2Time,
          difference: game.player2Time ? Math.abs(game.player2Time - game.goalTime) : null
        },
        winner: winner ? {
          id: winner._id,
          username: winner.username
        } : null,
        duration: game.gameEndedAt - game.gameStartedAt
      };

      this.io.to(`game_${gameId}`).emit('game_finished', gameResult);

      setTimeout(() => {
        this.cleanupGame(gameId);
      }, 10000);

    } catch (error) {
      console.error('Finish game error:', error);
    }
  }

  /**
   * Update player statistics after game
   */
  async updatePlayerStats(game) {
    try {
      const player1Update = {
        $inc: { 'gameStats.gamesPlayed': 1 }
      };
      const player2Update = {
        $inc: { 'gameStats.gamesPlayed': 1 }
      };

      if (game.winner) {
        if (game.winner.toString() === game.player1.toString()) {
          player1Update.$inc['gameStats.gamesWon'] = 1;
        } else {
          player2Update.$inc['gameStats.gamesWon'] = 1;
        }
      }

      if (game.player1Time !== null) {
        const player1Accuracy = Math.abs(game.player1Time - game.goalTime);
        player1Update.$min = { 'gameStats.bestTime': player1Accuracy };
      }

      if (game.player2Time !== null) {
        const player2Accuracy = Math.abs(game.player2Time - game.goalTime);
        player2Update.$min = { 'gameStats.bestTime': player2Accuracy };
      }

      await Promise.all([
        User.findByIdAndUpdate(game.player1, player1Update),
        User.findByIdAndUpdate(game.player2, player2Update)
      ]);

    } catch (error) {
      console.error('Update player stats error:', error);
    }
  }

  /**
   * Handle player disconnect
   */
  async handleDisconnect(socket) {
    try {
      const playerData = this.playerSockets.get(socket.id);
      if (!playerData) return;

      const { gameId } = playerData;
      const gameSession = await GameSession.findOne({ gameId });
      
      if (gameSession) {
        gameSession.disconnectPlayer(socket.id);
        await gameSession.save();

        this.io.to(`game_${gameId}`).emit('player_disconnected', {
          player1Connected: gameSession.player1Connected,
          player2Connected: gameSession.player2Connected,
          connectedCount: gameSession.getConnectedPlayersCount()
        });

        if (gameSession.gameState === 'playing' && gameSession.getConnectedPlayersCount() === 0) {
          const game = await Game.findById(gameId);
          if (game && game.status === 'active') {
            game.status = 'cancelled';
            await game.save();
          }
        }
      }

      this.playerSockets.delete(socket.id);

    } catch (error) {
      console.error('Handle disconnect error:', error);
    }
  }

  /**
   * Handle player leaving game
   */
  async handleLeaveGame(socket, data) {
    await this.handleDisconnect(socket);
    socket.leave(`game_${data.gameId}`);
  }

  /**
   * Cleanup finished game data
   */
  async cleanupGame(gameId) {
    try {
      await GameSession.findOneAndDelete({ gameId });
      this.activeGames.delete(gameId);
      
      this.io.to(`game_${gameId}`).emit('game_cleanup');
      
      const sockets = await this.io.in(`game_${gameId}`).fetchSockets();
      sockets.forEach(socket => {
        socket.leave(`game_${gameId}`);
        this.playerSockets.delete(socket.id);
      });

    } catch (error) {
      console.error('Cleanup game error:', error);
    }
  }
}

module.exports = GameSocketHandler;