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
      const userId = socket.userId; // Set by authentication middleware

      console.log(`[GAME] Join attempt - User: ${userId}, Game: ${gameId}`);

      if (!userId) {
        console.error('[GAME] Join failed - No userId');
        socket.emit('game_error', { message: 'Authentication required' });
        return;
      }

      const game = await Game.findById(gameId).populate('player1 player2');
      if (!game) {
        console.error(`[GAME] Join failed - Game ${gameId} not found`);
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }

      console.log(`[GAME] Game found - Status: ${game.status}`);

      // Check if game was cancelled
      if (game.status === 'cancelled') {
        console.error(`[GAME] Join failed - Game ${gameId} was cancelled`);
        socket.emit('game_error', { message: 'Game was cancelled' });
        return;
      }

      // Check if game is in a joinable state
      if (!['waiting', 'starting', 'active'].includes(game.status)) {
        console.error(`[GAME] Join failed - Invalid status: ${game.status}`);
        socket.emit('game_error', { message: `Game is in ${game.status} state and cannot be joined` });
        return;
      }

      const isPlayer = game.player1._id.toString() === userId || 
                      game.player2._id.toString() === userId;
      
      if (!isPlayer) {
        socket.emit('game_error', { message: 'You are not part of this game' });
        return;
      }

      let gameSession = await GameSession.findOne({ gameId: gameId });
      if (!gameSession) {
        gameSession = new GameSession({
          gameId: gameId,
          gameState: 'waiting_players'
        });
      }

      gameSession.setPlayerConnection(userId, socket.id, true, game);
      await gameSession.save();

      socket.join(`game_${gameId}`);
      this.playerSockets.set(socket.id, { userId, gameId, gameSession });

      console.log(`[GAME] User ${userId} successfully joined game ${gameId}`);

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

      // Start countdown when both players are connected and game is ready
      if (gameSession.areBothPlayersConnected() && 
          (game.status === 'waiting' || game.status === 'active') &&
          gameSession.gameState === 'waiting_players') {
        await this.startGameCountdown(gameId);
      }

      this.io.to(`game_${gameId}`).emit('player_connection_update', {
        player1Connected: gameSession.player1Connected,
        player2Connected: gameSession.player2Connected,
        connectedCount: gameSession.getConnectedPlayersCount()
      });

    } catch (error) {
      console.error('[GAME] Join game error:', error);
      console.error('[GAME] Error stack:', error.stack);
      socket.emit('game_error', { message: 'Failed to join game', detail: error.message });
    }
  }

  /**
   * Start game countdown
   */
  async startGameCountdown(gameId) {
    try {
      console.log(`[GAME] ======= Starting countdown for game ${gameId} =======`);
      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) {
        console.error(`[GAME] Cannot start countdown - game or session not found`);
        return;
      }

      console.log(`[GAME] Current goal time: ${game.goalTime}ms (${game.goalTime/1000}s)`);
      console.log(`[GAME] Countdown duration: ${game.settings.countdownTime}ms`);

      game.status = 'starting';
      gameSession.gameState = 'countdown';
      gameSession.countdownStartedAt = new Date();

      await game.save();
      await gameSession.save();

      console.log(`[GAME] Emitting game_countdown_start to room game_${gameId}`);
      this.io.to(`game_${gameId}`).emit('game_countdown_start', {
        countdownTime: game.settings.countdownTime,
        goalTime: game.goalTime,
        startTime: gameSession.countdownStartedAt
      });

      console.log(`[GAME] Countdown will last ${game.settings.countdownTime}ms, then start gameplay`);
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
      console.log(`[GAME] ======= Starting gameplay for game ${gameId} =======`);
      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) {
        console.error(`[GAME] Cannot start gameplay - game or session not found`);
        return;
      }

      console.log(`[GAME] Goal time for this round: ${game.goalTime}ms (${game.goalTime/1000}s)`);
      console.log(`[GAME] Round: ${game.currentRound}/${game.totalRounds}`);

      game.status = 'active';
      game.gameStartedAt = new Date();
      gameSession.gameState = 'playing';
      gameSession.gameStartedAt = new Date();

      await game.save();
      await gameSession.save();

      console.log(`[GAME] Emitting game_start to room game_${gameId}`);
      console.log(`[GAME] Players should now be able to click!`);
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
        socket.emit('game_error', { message: 'Player not found in active games' });
        return;
      }

      const { userId, gameId } = playerData;
      const clickTime = new Date();

      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession || gameSession.gameState !== 'playing') {
        socket.emit('game_error', { message: 'Game is not in playing state' });
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
        await this.finishRound(gameId);
      }

    } catch (error) {
      console.error('Player click error:', error);
      socket.emit('game_error', { message: 'Failed to register click' });
    }
  }

  /**
   * Finish a round and determine round winner
   */
  async finishRound(gameId) {
    try {
      const game = await Game.findById(gameId).populate('player1 player2');
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) return;

      // Determine round winner
      const roundWinner = game.calculateWinner();
      
      // Save round results
      const roundData = {
        roundNumber: game.currentRound,
        goalTime: game.goalTime,
        player1Time: game.player1Time,
        player2Time: game.player2Time,
        winner: roundWinner,
        completedAt: new Date()
      };
      
      game.rounds.push(roundData);
      
      // Update scores
      if (roundWinner) {
        if (roundWinner.toString() === game.player1.toString()) {
          game.player1Score += 1;
        } else {
          game.player2Score += 1;
        }
      }

      const player1Diff = game.player1Time ? Math.abs(game.player1Time - game.goalTime) : null;
      const player2Diff = game.player2Time ? Math.abs(game.player2Time - game.goalTime) : null;

      // Emit round results
      this.io.to(`game_${gameId}`).emit('round_finished', {
        round: game.currentRound,
        goalTime: game.goalTime,
        player1: {
          id: game.player1._id,
          username: game.player1.username,
          time: game.player1Time,
          difference: player1Diff
        },
        player2: {
          id: game.player2._id,
          username: game.player2.username,
          time: game.player2Time,
          difference: player2Diff
        },
        roundWinner: roundWinner ? {
          id: roundWinner._id,
          username: roundWinner.username
        } : null,
        scores: {
          player1: game.player1Score,
          player2: game.player2Score
        }
      });

      // Check if game is complete (best of 3)
      if (game.currentRound >= game.totalRounds || game.player1Score >= 2 || game.player2Score >= 2) {
        await this.finishGame(gameId, game);
      } else {
        // Start next round
        game.currentRound += 1;
        game.player1Time = null;
        game.player2Time = null;
        game.player1ClickTime = null;
        game.player2ClickTime = null;
        game.goalTime = Game.generateGoalTime(); // New random goal time for next round
        
        await game.save();

        // Reset game session for next round
        gameSession.gameState = 'waiting_round';
        gameSession.raceWinner = null;
        await gameSession.save();

        // Notify players to prepare for next round
        setTimeout(async () => {
          gameSession.gameState = 'countdown';
          await gameSession.save();
          
          this.io.to(`game_${gameId}`).emit('next_round_starting', {
            round: game.currentRound,
            goalTime: game.goalTime,
            scores: {
              player1: game.player1Score,
              player2: game.player2Score
            }
          });

          setTimeout(async () => {
            await this.startGameplay(gameId);
          }, 3000);
        }, 3000);
      }

    } catch (error) {
      console.error('Finish round error:', error);
    }
  }

  /**
   * Finish the game and determine overall winner
   */
  async finishGame(gameId, gameData = null) {
    try {
      const game = gameData || await Game.findById(gameId).populate('player1 player2');
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) return;

      // Determine overall winner based on best of 3
      let overallWinner = null;
      if (game.player1Score > game.player2Score) {
        overallWinner = game.player1;
      } else if (game.player2Score > game.player1Score) {
        overallWinner = game.player2;
      }

      game.winner = overallWinner;
      game.status = 'finished';
      game.gameEndedAt = new Date();

      gameSession.gameState = 'finished';

      await game.save();
      await gameSession.save();

      await this.updatePlayerStats(game);

      const gameResult = {
        gameId: gameId,
        totalRounds: game.totalRounds,
        roundsPlayed: game.rounds.length,
        player1: {
          id: game.player1._id,
          username: game.player1.username,
          score: game.player1Score
        },
        player2: {
          id: game.player2._id,
          username: game.player2.username,
          score: game.player2Score
        },
        rounds: game.rounds,
        winner: overallWinner ? {
          id: overallWinner._id,
          username: overallWinner.username
        } : null,
        duration: game.gameEndedAt - game.gameStartedAt
      };

      this.io.to(`game_${gameId}`).emit('game_finished', gameResult);

      setTimeout(() => {
        this.cleanupGame(gameId);
      }, 15000);

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

        // Cancel game if both players disconnect or if one disconnects during active gameplay
        const game = await Game.findById(gameId);
        if (game && (game.status === 'active' || game.status === 'starting')) {
          if (gameSession.getConnectedPlayersCount() === 0) {
            // Both players disconnected - cancel game
            game.status = 'cancelled';
            game.gameEndedAt = new Date();
            await game.save();
            console.log(`[GAME] Game ${gameId} cancelled - both players disconnected`);
          } else if (gameSession.gameState === 'playing') {
            // One player disconnected during gameplay - opponent wins by forfeit
            const connectedPlayerId = gameSession.player1Connected ? 
              gameSession.player1SocketId : gameSession.player2SocketId;
            
            if (connectedPlayerId) {
              game.status = 'finished';
              game.gameEndedAt = new Date();
              // Set winner as the connected player
              const disconnectedIsPlayer1 = !gameSession.player1Connected;
              game.winner = disconnectedIsPlayer1 ? game.player2 : game.player1;
              await game.save();
              
              this.io.to(`game_${gameId}`).emit('game_ended_forfeit', {
                winner: game.winner,
                reason: 'opponent_disconnected'
              });
              
              console.log(`[GAME] Game ${gameId} ended by forfeit`);
            }
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
    console.log(`[GAME] Player leaving game ${data.gameId}, forceEnd: ${data.forceEnd}`);
    
    if (data.forceEnd) {
      // Force cancel the game immediately
      try {
        const game = await Game.findById(data.gameId);
        if (game && game.status !== 'finished' && game.status !== 'cancelled') {
          game.status = 'cancelled';
          game.gameEndedAt = new Date();
          game.cancelReason = 'player_left';
          await game.save();
          console.log(`[GAME] Game ${data.gameId} force cancelled by leave_game`);
          
          // Notify other player
          this.io.to(`game_${data.gameId}`).emit('game_ended_forfeit', {
            reason: 'opponent_left',
            message: 'Opponent left the game'
          });
        }
        
        await GameSession.findOneAndDelete({ gameId: data.gameId });
      } catch (error) {
        console.error('[GAME] Error force cancelling game:', error);
      }
    }
    
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