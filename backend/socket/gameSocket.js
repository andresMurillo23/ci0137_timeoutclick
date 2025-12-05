const Game = require('../models/Game');
const GameSession = require('../models/GameSession');
const User = require('../models/User');

/**
 * Helper function to safely get player data (handles guest case where player1 can be null)
 */
function getPlayerData(player) {
  if (!player) {
    return {
      id: null,
      username: 'Guest',
      avatar: null
    };
  }
  return {
    id: player._id,
    username: player.username,
    avatar: player.avatar
  };
}

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
    socket.on('guest_waiting', (data) => this.handleGuestWaiting(socket, data));
    socket.on('player_click', (data) => this.handlePlayerClick(socket, data));
    socket.on('player_ready_for_next_round', (data) => this.handlePlayerReadyForNextRound(socket, data));
    socket.on('challenge_accepted', (data) => this.handleChallengeAccepted(socket, data));
    socket.on('challenge_declined', (data) => this.handleChallengeDeclined(socket, data));
    socket.on('rematch_request', (data) => this.handleRematchRequest(socket, data));
    socket.on('rematch_response', (data) => this.handleRematchResponse(socket, data));
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
      const isGuest = socket.isGuest;

      if (!userId && !isGuest) {
        socket.emit('game_error', { message: 'Authentication required' });
        return;
      }

      const game = await Game.findById(gameId).populate('player1 player2');
      if (!game) {
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }

      // Check if game was cancelled
      if (game.status === 'cancelled') {
        socket.emit('game_error', { message: 'Game was cancelled' });
        return;
      }

      // Check if game is in a joinable state
      if (!['waiting', 'starting', 'active'].includes(game.status)) {
        socket.emit('game_error', { message: `Game is in ${game.status} state and cannot be joined` });
        return;
      }

      // Check if user is part of this game (handle guest case where player1 is null)
      const player1Id = game.player1 ? game.player1._id.toString() : null;
      const player2Id = game.player2 ? game.player2._id.toString() : null;
      
      // For guests, they are player1 (null) in guest_challenge games
      const isPlayer = (isGuest && game.gameType === 'guest_challenge' && player1Id === null) ||
                      player1Id === userId || 
                      player2Id === userId;

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

      // Use special ID for guests
      const playerIdForSession = isGuest ? 'guest_player' : userId;
      
      gameSession.setPlayerConnection(playerIdForSession, socket.id, true, game);
      await gameSession.save();

      socket.join(`game_${gameId}`);
      this.playerSockets.set(socket.id, { userId: playerIdForSession, gameId, gameSession });

      console.log(`[GAME] User ${playerIdForSession} (Guest: ${isGuest}) successfully joined game ${gameId}`);

      // Determine player role (handle guest case)
      const playerRole = (isGuest || player1Id === userId) ? 'player1' : 'player2';

      socket.emit('game_joined', {
        gameId: gameId,
        playerRole: playerRole,
        game: {
          id: game._id,
          player1: game.player1 ? {
            id: game.player1._id,
            username: game.player1.username,
            avatar: game.player1.avatar
          } : {
            id: null,
            username: 'Guest',
            avatar: null
          },
          player2: {
            id: game.player2._id,
            username: game.player2.username,
            avatar: game.player2.avatar
          },
          status: game.status,
          goalTime: game.goalTime,
          gameType: game.gameType
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
      // Handle guest case where player1 can be null
      const player1Id = game.player1 ? game.player1.toString() : null;
      const isPlayer1 = (player1Id === null && userId === 'guest_player') || player1Id === userId;

      console.log(`[GAME] Time difference: ${timeDifference}ms`);
      console.log(`[GAME] Is Player 1: ${isPlayer1} (userId: ${userId})`);
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

      // If game is already finished, ignore ready signal
      if (game.status === 'finished' || gameSession.gameState === 'finished') {
        console.log(`[GAME] Game already finished, ignoring ready signal`);
        return;
      }

      // Mark player as ready
      // For guest games, player1 is null, so guest is always considered player1
      const player1Id = game.player1?._id?.toString();
      const player2Id = game.player2?._id?.toString();
      
      const isPlayer1 = (userId && player1Id && userId === player1Id) || 
                        (socket.isGuest && !player1Id); // Guest is player1 when player1 is null
      
      const player1Data = getPlayerData(game.player1);
      const player2Data = getPlayerData(game.player2);
      
      if (isPlayer1) {
        gameSession.player1Ready = true;
        console.log(`[GAME] Player 1 (${player1Data.username}) is ready for next round`);
      } else {
        gameSession.player2Ready = true;
        console.log(`[GAME] Player 2 (${player2Data.username}) is ready for next round`);
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

      const player1Data = getPlayerData(game.player1);
      const player2Data = getPlayerData(game.player2);

      console.log(`[GAME] Player 1 (${player1Data.username}) time: ${game.player1Time}ms`);
      console.log(`[GAME] Player 2 (${player2Data.username}) time: ${game.player2Time}ms`);
      console.log(`[GAME] Goal time: ${game.goalTime}ms`);

      // Determine round winner
      const roundWinnerResult = game.calculateWinner(); // Returns ObjectId, 'guest_player', or null

      console.log(`[GAME] Round winner result:`, roundWinnerResult);
      console.log(`[GAME] Round winner type:`, typeof roundWinnerResult);

      // Extract ObjectId and find winner object from populated players
      let roundWinnerId = null;
      let roundWinner = null;
      let isGuestWinner = false;

      if (roundWinnerResult) {
        // Check if guest won
        if (roundWinnerResult === 'guest_player') {
          roundWinnerId = null; // Guest doesn't have an ID
          roundWinner = null;
          isGuestWinner = true;
          console.log(`[GAME] Round winner: Player 1 (Guest)`);
        } else {
          // If it's a User object with _id, extract the _id
          if (roundWinnerResult._id) {
            roundWinnerId = roundWinnerResult._id;
          } else {
            // Otherwise it's already an ObjectId
            roundWinnerId = roundWinnerResult;
          }

          console.log(`[GAME] Round winner ID:`, roundWinnerId);

          const player1Id = game.player1?._id?.toString();
          const player2Id = game.player2?._id?.toString();

          if (player1Id && roundWinnerId.toString() === player1Id) {
            roundWinner = game.player1;
            console.log(`[GAME] Round winner: Player 1 (${getPlayerData(game.player1).username})`);
          } else if (player2Id && roundWinnerId.toString() === player2Id) {
            roundWinner = game.player2;
            console.log(`[GAME] Round winner: Player 2 (${getPlayerData(game.player2).username})`);
          }
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

      console.log(`[GAME] ===== SCORE UPDATE =====`);
      console.log(`[GAME] Before update - P1: ${game.player1Score}, P2: ${game.player2Score}`);
      console.log(`[GAME] isGuestWinner: ${isGuestWinner}`);
      console.log(`[GAME] roundWinnerId: ${roundWinnerId}`);
      
      // Update scores
      if (isGuestWinner) {
        // Guest (player1) won
        game.player1Score += 1;
        console.log(`[GAME] Player 1 (Guest) WON - score: ${game.player1Score}`);
      } else if (roundWinnerId) {
        const player1Id = game.player1?._id?.toString();
        const player2Id = game.player2?._id?.toString();
        
        console.log(`[GAME] Comparing IDs - roundWinner: ${roundWinnerId.toString()}, P1: ${player1Id}, P2: ${player2Id}`);
        
        if (player1Id && roundWinnerId.toString() === player1Id) {
          game.player1Score += 1;
          console.log(`[GAME] Player 1 WON - score: ${game.player1Score}`);
        } else if (player2Id && roundWinnerId.toString() === player2Id) {
          game.player2Score += 1;
          console.log(`[GAME] Player 2 WON - score: ${game.player2Score}`);
        } else {
          console.log(`[GAME] WARNING: Winner ID didn't match any player!`);
        }
      } else {
        console.log(`[GAME] Round was a TIE - no score update`);
      }
      
      console.log(`[GAME] After update - P1: ${game.player1Score}, P2: ${game.player2Score}`);
      console.log(`[GAME] =======================`);

      await game.save();
      console.log(`[GAME] Game saved with updated scores`);

      const player1Diff = game.player1Time ? Math.abs(game.player1Time - game.goalTime) : null;
      const player2Diff = game.player2Time ? Math.abs(game.player2Time - game.goalTime) : null;

      console.log(`[GAME] Player 1 difference: ${player1Diff}ms`);
      console.log(`[GAME] Player 2 difference: ${player2Diff}ms`);

      // Emit round results (using player1Data and player2Data already declared above)
      const roundFinishedData = {
        round: game.currentRound,
        goalTime: game.goalTime,
        player1: {
          id: player1Data.id,
          username: player1Data.username,
          time: game.player1Time,
          difference: player1Diff
        },
        player2: {
          id: player2Data.id,
          username: player2Data.username,
          time: game.player2Time,
          difference: player2Diff
        },
        roundWinner: isGuestWinner ? {
          id: 'guest',
          username: 'Guest'
        } : (roundWinner ? {
          id: roundWinner._id,
          username: roundWinner.username
        } : null),
        scores: {
          player1: game.player1Score,
          player2: game.player2Score
        }
      };

      console.log(`[GAME] Emitting round_finished:`, JSON.stringify(roundFinishedData, null, 2));
      this.io.to(`game_${gameId}`).emit('round_finished', roundFinishedData);

      // Check if game is complete (best of 3)
      console.log(`[GAME] Checking if game should finish - currentRound: ${game.currentRound}/${game.totalRounds}, P1 Score: ${game.player1Score}, P2 Score: ${game.player2Score}`);
      if (game.currentRound >= game.totalRounds || game.player1Score >= 2 || game.player2Score >= 2) {
        console.log(`[GAME] *** GAME COMPLETE! Calling finishGame() ***`);
        await this.finishGame(gameId, game);
      } else {
        console.log(`[GAME] Game continues - preparing next round`);
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
      console.log(`[GAME] ======= FINISHING GAME ${gameId} =======`);
      const game = gameData || await Game.findById(gameId).populate('player1 player2');
      console.log(`[GAME] Game loaded, status: ${game?.status}`);
      const gameSession = await GameSession.findOne({ gameId });
      console.log(`[GAME] GameSession loaded, state: ${gameSession?.gameState}`);

      if (!game || !gameSession) {
        console.log(`[GAME] ERROR: Game or session not found!`);
        return;
      }

      console.log(`[GAME] Scores - P1: ${game.player1Score}, P2: ${game.player2Score}`);
      console.log(`[GAME] Rounds array length: ${game.rounds?.length || 0}`);
      
      const player1Data = getPlayerData(game.player1);
      const player2Data = getPlayerData(game.player2);
      
      // Determine overall winner based on best of 3
      let overallWinner = null;
      let isGuestOverallWinner = false;
      if (game.player1Score > game.player2Score) {
        overallWinner = game.player1;
        isGuestOverallWinner = !game.player1; // Guest is player1 when player1 is null
        console.log(`[GAME] Overall winner: Player 1 (${player1Data.username})`);
      } else if (game.player2Score > game.player1Score) {
        overallWinner = game.player2;
        console.log(`[GAME] Overall winner: Player 2 (${player2Data.username})`);
      } else {
        console.log(`[GAME] Game tied!`);
      }

      game.winner = overallWinner;
      game.status = 'finished';
      game.gameEndedAt = new Date();
      console.log(`[GAME] Setting game status to 'finished'`);

      game.winner = overallWinner;
      game.status = 'finished';
      game.gameEndedAt = new Date();
      console.log(`[GAME] Setting game status to 'finished'`);

      gameSession.gameState = 'finished';

      console.log(`[GAME] Saving game and session...`);
      await game.save();
      await gameSession.save();
      console.log(`[GAME] Game and session saved successfully!`);

      console.log(`[GAME] Updating player stats...`);
      await this.updatePlayerStats(game);
      console.log(`[GAME] Player stats updated!`);

      // Use player1Data and player2Data already declared above
      const gameResult = {
        gameId: gameId,
        totalRounds: game.totalRounds,
        roundsPlayed: game.rounds.length,
        player1: {
          id: player1Data.id,
          username: player1Data.username,
          score: game.player1Score
        },
        player2: {
          id: player2Data.id,
          username: player2Data.username,
          score: game.player2Score
        },
        rounds: game.rounds,
        winner: isGuestOverallWinner ? {
          id: 'guest',
          username: 'Guest'
        } : (overallWinner ? {
          id: overallWinner._id,
          username: overallWinner.username
        } : null),
        duration: game.gameEndedAt - game.gameStartedAt
      };

      console.log(`[GAME] Emitting game_finished event...`);
      console.log(`[GAME] Game result:`, JSON.stringify(gameResult, null, 2));
      this.io.to(`game_${gameId}`).emit('game_finished', gameResult);
      console.log(`[GAME] game_finished emitted successfully!`);

      // Clean up playerSockets and game session after a delay
      // This allows players to see final results and potentially rematch
      setTimeout(async () => {
        console.log(`[GAME] Cleaning up game ${gameId} after 15 seconds`);
        
        // Remove players from socket map so they can join new games
        const sockets = await this.io.in(`game_${gameId}`).fetchSockets();
        sockets.forEach(socket => {
          this.playerSockets.delete(socket.id);
          console.log(`[GAME] Removed socket ${socket.id} from playerSockets`);
        });
        
        this.cleanupGame(gameId);
      }, 15000);
      
      console.log(`[GAME] ======= GAME FINISH COMPLETE =======`);

    } catch (error) {
      console.error('[GAME] Finish game error:', error);
      console.error('[GAME] Error stack:', error.stack);
    }
  }

  /**
   * Update player statistics after game
   */
  async updatePlayerStats(game) {
    try {
      // For guest games, only update player2 stats (the registered user)
      if (!game.player1 || game.gameType === 'guest_challenge') {
        console.log('[GAME] Updating stats for registered player in guest game');
        
        const player2Update = {
          $inc: { 'gameStats.gamesPlayed': 1 }
        };

        // Check if player2 won (guest didn't win)
        if (game.winner && game.winner.toString() === game.player2.toString()) {
          player2Update.$inc['gameStats.gamesWon'] = 1;
        }

        if (game.player2Time !== null) {
          const player2Accuracy = Math.abs(game.player2Time - game.goalTime);
          player2Update.$min = { 'gameStats.bestTime': player2Accuracy };
        }

        await User.findByIdAndUpdate(game.player2, player2Update);
        console.log('[GAME] Player2 stats updated for guest game');
        return;
      }

      const player1Update = {
        $inc: { 'gameStats.gamesPlayed': 1 }
      };
      const player2Update = {
        $inc: { 'gameStats.gamesPlayed': 1 }
      };

      if (game.winner) {
        const player1Id = game.player1 ? game.player1.toString() : null;
        if (game.winner.toString() === player1Id) {
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
   * Handle rematch request from a player
   */
  async handleRematchRequest(socket, data) {
    try {
      console.log('[REMATCH] ======= Rematch request received =======');
      console.log('[REMATCH] Socket ID:', socket.id);
      console.log('[REMATCH] Data:', data);
      
      const { gameId } = data;
      const userId = socket.userId; // Get userId directly from socket
      
      if (!userId) {
        console.log('[REMATCH] ERROR: No userId in socket');
        return;
      }
      
      console.log('[REMATCH] Player requesting rematch:', userId);
      
      // Get the finished game to find opponent
      const game = await Game.findById(gameId).populate('player1 player2');
      if (!game) {
        console.log('[REMATCH] ERROR: Game not found');
        return;
      }
      
      // Guest games don't support rematch
      if (!game.player1 || game.gameType === 'guest_challenge') {
        console.log('[REMATCH] ERROR: Rematch not allowed for guest games');
        socket.emit('game_error', { message: 'Rematch not available for guest games' });
        return;
      }
      
      // Determine opponent
      const isPlayer1 = game.player1._id.toString() === userId;
      const opponent = isPlayer1 ? game.player2 : game.player1;
      const opponentId = opponent._id.toString();
      
      console.log('[REMATCH] Opponent ID:', opponentId);
      console.log('[REMATCH] Looking for opponent in connected sockets...');
      
      // Find opponent's socket by iterating through all connected sockets
      const sockets = await this.io.fetchSockets();
      console.log('[REMATCH] Total sockets found:', sockets.length);
      
      let opponentSocket = null;
      
      for (const s of sockets) {
        console.log('[REMATCH] Checking socket:', s.id, 'userId:', s.userId);
        if (s.userId === opponentId) {
          opponentSocket = s;
          console.log('[REMATCH] ✓ FOUND OPPONENT!');
          break;
        }
      }
      
      if (!opponentSocket) {
        console.log('[REMATCH] ERROR: Opponent not connected');
        socket.emit('rematch_declined', { 
          reason: 'Opponent is not connected',
          message: 'Your opponent has left the game.'
        });
        return;
      }
      
      console.log('[REMATCH] Opponent socket found:', opponentSocket.id);
      console.log('[REMATCH] Notifying opponent about rematch request...');
      
      // Notify opponent about rematch request
      this.io.to(opponentSocket.id).emit('rematch_requested', {
        gameId: gameId,
        requesterId: userId,
        requesterName: isPlayer1 ? game.player1.username : game.player2.username
      });
      
      console.log('[REMATCH] Rematch request sent to opponent');
      
    } catch (error) {
      console.error('[REMATCH] Error handling rematch request:', error);
      console.error('[REMATCH] Error stack:', error.stack);
    }
  }
  
  /**
   * Handle rematch response (accept/decline)
   */
  async handleRematchResponse(socket, data) {
    try {
      console.log('[REMATCH] ======= Rematch response received =======');
      console.log('[REMATCH] Socket ID:', socket.id);
      console.log('[REMATCH] Data:', data);
      
      const { gameId, accepted } = data;
      const userId = socket.userId; // Get userId directly from socket
      
      if (!userId) {
        console.log('[REMATCH] ERROR: No userId in socket');
        return;
      }
      
      console.log('[REMATCH] Player responding:', userId, 'Accepted:', accepted);
      
      // Get the finished game to find requester
      const oldGame = await Game.findById(gameId).populate('player1 player2');
      if (!oldGame) {
        console.log('[REMATCH] ERROR: Game not found');
        return;
      }
      
      // Guest games don't support rematch
      if (!oldGame.player1 || oldGame.gameType === 'guest_challenge') {
        console.log('[REMATCH] ERROR: Rematch not allowed for guest games');
        socket.emit('game_error', { message: 'Rematch not available for guest games' });
        return;
      }
      
      // Determine requester (the other player)
      const isPlayer1 = oldGame.player1._id.toString() === userId;
      const requester = isPlayer1 ? oldGame.player2 : oldGame.player1;
      const requesterId = requester._id.toString();
      
      console.log('[REMATCH] Requester ID:', requesterId);
      console.log('[REMATCH] Looking for requester in connected sockets...');
      
      // Find requester's socket by iterating through all connected sockets
      const sockets = await this.io.fetchSockets();
      let requesterSocket = null;
      
      for (const s of sockets) {
        console.log('[REMATCH] Checking socket:', s.id, 'userId:', s.userId);
        if (s.userId === requesterId) {
          requesterSocket = s;
          break;
        }
      }
      
      if (!requesterSocket) {
        console.log('[REMATCH] ERROR: Requester not connected');
        return;
      }
      
      if (!accepted) {
        console.log('[REMATCH] Rematch DECLINED');
        // Notify requester that rematch was declined
        this.io.to(requesterSocket.id).emit('rematch_declined', {
          reason: 'Opponent declined',
          message: "Sorry, your opponent doesn't want a rematch."
        });
        return;
      }
      
      console.log('[REMATCH] Rematch ACCEPTED - Creating new game...');
      
      // Create new game with same players
      const newGame = new Game({
        player1: oldGame.player1._id,
        player2: oldGame.player2._id,
        goalTime: Game.generateGoalTime(),
        status: 'active',
        currentRound: 1,
        totalRounds: 3,
        player1Score: 0,
        player2Score: 0,
        rounds: []
      });
      
      await newGame.save();
      console.log('[REMATCH] New game created:', newGame._id);
      
      // Notify both players about new game
      const rematchData = {
        gameId: newGame._id.toString(),
        message: 'Rematch accepted! Starting new game...'
      };
      
      this.io.to(requesterSocket.id).emit('rematch_accepted', rematchData);
      this.io.to(socket.id).emit('rematch_accepted', rematchData);
      
      console.log('[REMATCH] Both players notified - they should redirect to new game');
      
    } catch (error) {
      console.error('[REMATCH] Error handling rematch response:', error);
      console.error('[REMATCH] Error stack:', error.stack);
    }
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

  /**
   * Handle guest waiting for challenge acceptance
   */
  async handleGuestWaiting(socket, data) {
    try {
      const { gameId } = data;
      console.log(`\n========== GUEST WAITING DEBUG ==========`);
      console.log(`[CHALLENGE-DEBUG] Guest waiting event received:`);
      console.log(`  - Socket ID: ${socket.id}`);
      console.log(`  - Is Guest: ${socket.isGuest}`);
      console.log(`  - Game ID: ${gameId}`);

      // Verify game exists and check its status
      const game = await Game.findById(gameId);
      if (!game) {
        console.error(`[CHALLENGE-DEBUG] Game ${gameId} not found`);
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }
      
      console.log(`[CHALLENGE-DEBUG] Game status: ${game.status}`);
      console.log(`[CHALLENGE-DEBUG] Game type: ${game.gameType}`);

      // Join a waiting room (not the actual game room yet)
      socket.join(`game_${gameId}_waiting`);
      
      console.log(`[CHALLENGE-DEBUG] Guest joined waiting room: game_${gameId}_waiting`);
      console.log(`[CHALLENGE-DEBUG] Current socket rooms:`, Array.from(socket.rooms));
      console.log(`======================================\n`);
    } catch (error) {
      console.error('[CHALLENGE-DEBUG] Error in guest waiting:', error);
      socket.emit('game_error', { message: error.message });
    }
  }

  /**
   * Handle challenge accepted (for guest challenges)
   */
  async handleChallengeAccepted(socket, data) {
    try {
      const { gameId } = data;
      console.log(`\n========== CHALLENGE ACCEPTED DEBUG ==========`);
      console.log(`[CHALLENGE-DEBUG] Player accepted guest challenge`);
      console.log(`  - Socket ID: ${socket.id}`);
      console.log(`  - Game ID: ${gameId}`);

      // Verify game exists and check status
      const game = await Game.findById(gameId);
      if (!game) {
        console.error(`[CHALLENGE-DEBUG] Game not found`);
        socket.emit('game_error', { message: 'Game not found' });
        return;
      }
      
      console.log(`[CHALLENGE-DEBUG] Game status: ${game.status}`);
      console.log(`[CHALLENGE-DEBUG] Game type: ${game.gameType}`);
      
      // Update game status to 'waiting' if needed
      if (game.status === 'pending') {
        game.status = 'waiting';
        await game.save();
        console.log(`[CHALLENGE-DEBUG] Game status updated: pending → waiting`);
      }

      // Notify guest in waiting room that challenge was accepted
      console.log(`[CHALLENGE-DEBUG] Emitting challenge_response to room: game_${gameId}_waiting`);
      this.io.to(`game_${gameId}_waiting`).emit('challenge_response', { accepted: true });

      // Also notify in the actual game room (in case guest already joined)
      console.log(`[CHALLENGE-DEBUG] Emitting challenge_response to room: game_${gameId}`);
      this.io.to(`game_${gameId}`).emit('challenge_response', { accepted: true });

      console.log(`[CHALLENGE-DEBUG] Challenge acceptance notifications sent`);
      
      // Check if both players are connected and start game
      const gameSession = await GameSession.findOne({ gameId });
      if (gameSession && gameSession.player1Connected && gameSession.player2Connected) {
        console.log(`[CHALLENGE-DEBUG] Both players connected, starting countdown`);
        await this.startGameCountdown(gameId);
      } else {
        console.log(`[CHALLENGE-DEBUG] Waiting for both players to join game`);
      }
      console.log(`==============================================\n`);
    } catch (error) {
      console.error('[CHALLENGE-DEBUG] Error accepting challenge:', error);
    }
  }

  /**
   * Handle challenge declined (for guest challenges)
   */
  async handleChallengeDeclined(socket, data) {
    try {
      const { gameId } = data;
      console.log(`[CHALLENGE] Player declined guest challenge for game ${gameId}`);

      // Notify guest in waiting room that challenge was declined
      this.io.to(`game_${gameId}_waiting`).emit('challenge_response', { accepted: false });
      this.io.to(`game_${gameId}`).emit('challenge_response', { accepted: false });

      // Cancel the game
      await Game.findByIdAndUpdate(gameId, { status: 'cancelled' });
      await this.cleanupGame(gameId);
    } catch (error) {
      console.error('[CHALLENGE] Error declining challenge:', error);
    }
  }
}

module.exports = GameSocketHandler;