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
    socket.on('player_click', (data) => this.handlePlayerClick(socket, data));
    socket.on('player_ready_for_next_round', (data) => this.handlePlayerReadyForNextRound(socket, data));
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

      // Use findOneAndUpdate with upsert to avoid race condition
      let gameSession = await GameSession.findOneAndUpdate(
        { gameId: gameId },
        { 
          $setOnInsert: { 
            gameId: gameId,
            gameState: 'waiting_players'
          }
        },
        { upsert: true, new: true }
      );

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
    console.log(`[GAME] ======= Player click received =======`);
    console.log(`[GAME] Socket ID: ${socket.id}`);
    console.log(`[GAME] Click data:`, data);
    
    try {
      const playerData = this.playerSockets.get(socket.id);
      console.log(`[GAME] Player data from socket map:`, playerData);
      
      if (!playerData) {
        console.error('[GAME] Player not found in active games map!');
        socket.emit('game_error', { message: 'Player not found in active games' });
        return;
      }

      const { userId, gameId } = playerData;
      const clickTime = new Date();

      console.log(`[GAME] User ${userId} clicked in game ${gameId}`);
      console.log(`[GAME] Click time:`, clickTime);

      // Use findOneAndUpdate with atomic operations to prevent race conditions
      const game = await Game.findById(gameId);
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) {
        console.error('[GAME] Game or session not found!');
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }

      console.log(`[GAME] Game state: ${gameSession.gameState}`);
      console.log(`[GAME] Game status: ${game.status}`);

      if (gameSession.gameState !== 'playing') {
        console.error(`[GAME] Game is not in playing state! Current state: ${gameSession.gameState}`);
        socket.emit('game_error', { message: 'Game is not in playing state' });
        return;
      }

      const timeDifference = clickTime - gameSession.gameStartedAt;
      const isPlayer1 = game.player1.toString() === userId;

      console.log(`[GAME] Time difference: ${timeDifference}ms`);
      console.log(`[GAME] Is Player 1: ${isPlayer1}`);
      console.log(`[GAME] Current P1 time: ${game.player1Time}`);
      console.log(`[GAME] Current P2 time: ${game.player2Time}`);

      // Check if this player already clicked
      if ((isPlayer1 && game.player1Time !== null) || (!isPlayer1 && game.player2Time !== null)) {
        console.log(`[GAME] Player ${userId} already clicked in this round`);
        socket.emit('game_error', { message: 'You already clicked in this round' });
        return;
      }

      // Save click time atomically to prevent race conditions
      const updateQuery = isPlayer1 
        ? { player1Time: timeDifference, player1ClickTime: clickTime }
        : { player2Time: timeDifference, player2ClickTime: clickTime };

      await Game.findByIdAndUpdate(gameId, updateQuery);

      console.log(`[GAME] Player ${isPlayer1 ? 'P1' : 'P2'} clicked at ${timeDifference}ms (goal: ${game.goalTime}ms)`);

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

      // Reload game to get updated times
      const updatedGame = await Game.findById(gameId);

      // Check if both players have clicked
      if (updatedGame.player1Time !== null && updatedGame.player2Time !== null) {
        console.log(`[GAME] Both players clicked - finishing round`);
        await this.finishRound(gameId);
      } else {
        console.log(`[GAME] Waiting for other player to click...`);
        const currentRound = updatedGame.currentRound; // Capture current round for timeout check
        // Set timeout to finish round if other player doesn't click (e.g., 10 seconds)
        setTimeout(async () => {
          const gameCheck = await Game.findById(gameId);
          if (gameCheck && gameCheck.status === 'active' && 
              gameCheck.currentRound === currentRound && // Only timeout for the same round
              (gameCheck.player1Time === null || gameCheck.player2Time === null)) {
            console.log(`[GAME] Timeout for round ${currentRound} - finishing round with incomplete clicks`);
            await this.finishRound(gameId);
          } else if (gameCheck && gameCheck.currentRound !== currentRound) {
            console.log(`[GAME] Timeout ignored - already moved to round ${gameCheck.currentRound}`);
          }
        }, 10000); // 10 second timeout
      }

    } catch (error) {
      console.error('Player click error:', error);
      socket.emit('game_error', { message: 'Failed to register click' });
    }
  }

  /**
   * Handle player ready for next round
   */
  async handlePlayerReadyForNextRound(socket, data) {
    console.log(`[GAME] ======= Player ready for next round =======`);
    console.log(`[GAME] Socket ID: ${socket.id}`);
    console.log(`[GAME] Data:`, data);
    
    try {
      const playerData = this.playerSockets.get(socket.id);
      if (!playerData) {
        console.error('[GAME] Player not found in socket map');
        socket.emit('game_error', { message: 'Player session not found' });
        return;
      }

      const { userId, gameId } = playerData;
      const game = await Game.findById(gameId).populate('player1 player2');
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) {
        console.error('[GAME] Game or session not found');
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }

      // Mark player as ready
      const isPlayer1 = game.player1._id.toString() === userId;
      if (isPlayer1) {
        gameSession.player1Ready = true;
        console.log(`[GAME] Player 1 (${game.player1.username}) is ready for next round`);
      } else {
        gameSession.player2Ready = true;
        console.log(`[GAME] Player 2 (${game.player2.username}) is ready for next round`);
      }
      
      await gameSession.save();

      // Notify both players of ready status
      this.io.to(`game_${gameId}`).emit('player_confirmed_next_round', {
        player1Ready: gameSession.player1Ready,
        player2Ready: gameSession.player2Ready
      });

      // Check if both players are ready
      if (gameSession.player1Ready && gameSession.player2Ready) {
        console.log(`[GAME] Both players ready! Starting next round...`);
        
        setTimeout(async () => {
          console.log(`[GAME] Emitting next_round_starting for round ${game.currentRound}`);
          
          this.io.to(`game_${gameId}`).emit('next_round_starting', {
            round: game.currentRound,
            goalTime: game.goalTime,
            scores: {
              player1: game.player1Score,
              player2: game.player2Score
            }
          });

          // Wait 2 seconds then start countdown for next round
          setTimeout(async () => {
            console.log(`[GAME] Starting countdown for round ${game.currentRound}`);
            await this.startGameCountdown(gameId);
          }, 2000);
        }, 1000);
      } else {
        console.log(`[GAME] Waiting for other player... P1: ${gameSession.player1Ready}, P2: ${gameSession.player2Ready}`);
      }

    } catch (error) {
      console.error('Player ready for next round error:', error);
      socket.emit('game_error', { message: 'Failed to register ready status' });
    }
  }

  /**
   * Finish a round and determine round winner
   */
  async finishRound(gameId) {
    try {
      console.log(`[GAME] ======= Finishing round for game ${gameId} =======`);
      const game = await Game.findById(gameId).populate('player1 player2');
      const gameSession = await GameSession.findOne({ gameId });

      if (!game || !gameSession) {
        console.error('[GAME] Cannot finish round - game or session not found');
        return;
      }

      console.log(`[GAME] Player 1 (${game.player1.username}) time: ${game.player1Time}ms`);
      console.log(`[GAME] Player 2 (${game.player2.username}) time: ${game.player2Time}ms`);
      console.log(`[GAME] Goal time: ${game.goalTime}ms`);

      // Determine round winner
      const roundWinnerResult = game.calculateWinner(); // Returns ObjectId or User object or null
      
      console.log(`[GAME] Round winner result:`, roundWinnerResult);
      console.log(`[GAME] Round winner type:`, typeof roundWinnerResult);
      
      // Extract ObjectId and find winner object from populated players
      let roundWinnerId = null;
      let roundWinner = null;
      
      if (roundWinnerResult) {
        // If it's a User object with _id, extract the _id
        if (roundWinnerResult._id) {
          roundWinnerId = roundWinnerResult._id;
        } else {
          // Otherwise it's already an ObjectId
          roundWinnerId = roundWinnerResult;
        }
        
        console.log(`[GAME] Round winner ID:`, roundWinnerId);
        
        if (roundWinnerId.toString() === game.player1._id.toString()) {
          roundWinner = game.player1;
          console.log(`[GAME] Round winner: Player 1 (${game.player1.username})`);
        } else if (roundWinnerId.toString() === game.player2._id.toString()) {
          roundWinner = game.player2;
          console.log(`[GAME] Round winner: Player 2 (${game.player2.username})`);
        }
      } else {
        console.log(`[GAME] Round result: TIE`);
      }
      
      // Save round results
      const roundData = {
        roundNumber: game.currentRound,
        goalTime: game.goalTime,
        player1Time: game.player1Time,
        player2Time: game.player2Time,
        winner: roundWinnerId,
        completedAt: new Date()
      };
      
      game.rounds.push(roundData);
      
      // Update scores
      if (roundWinnerId) {
        if (roundWinnerId.toString() === game.player1._id.toString()) {
          game.player1Score += 1;
          console.log(`[GAME] Player 1 score: ${game.player1Score}`);
        } else {
          game.player2Score += 1;
          console.log(`[GAME] Player 2 score: ${game.player2Score}`);
        }
      }

      await game.save();
      console.log(`[GAME] Game saved with updated scores`);

      const player1Diff = game.player1Time ? Math.abs(game.player1Time - game.goalTime) : null;
      const player2Diff = game.player2Time ? Math.abs(game.player2Time - game.goalTime) : null;

      console.log(`[GAME] Player 1 difference: ${player1Diff}ms`);
      console.log(`[GAME] Player 2 difference: ${player2Diff}ms`);

      // Emit round results
      const roundFinishedData = {
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
      };
      
      console.log(`[GAME] Emitting round_finished:`, JSON.stringify(roundFinishedData, null, 2));
      this.io.to(`game_${gameId}`).emit('round_finished', roundFinishedData);

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
        gameSession.player1Ready = false;
        gameSession.player2Ready = false;
        await gameSession.save();

        console.log(`[GAME] Waiting for both players to confirm next round...`);
        console.log(`[GAME] Players need to click 'Next Round' button`);
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