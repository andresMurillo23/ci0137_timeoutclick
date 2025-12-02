/**
 * Duel page - Real-time game with Socket.IO
 * Handles click timing game between two players
 */

console.log('[DUEL] ========================================');
console.log('[DUEL] DUEL.JS LOADING...');
console.log('[DUEL] ========================================');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[DUEL] DOM Content Loaded event fired');
  console.log('[DUEL] Checking authentication...');
  
  if (!window.auth) {
    console.error('[DUEL] ERROR: window.auth is not defined!');
    alert('Authentication system not loaded');
    return;
  }

  if (!window.auth.requireAuth()) {
    console.log('[DUEL] User not authenticated, redirecting to login');
    window.location.href = '/pages/login.html';
    return;
  }

  console.log('[DUEL] User authenticated, proceeding...');

  // Get game ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');

  console.log('[DUEL] Game ID from URL:', gameId);

  if (!gameId) {
    console.error('[DUEL] ERROR: No game ID in URL!');
    alert('No game ID provided');
    window.location.href = '/pages/homeLogged.html';
    return;
  }

  // Socket.IO connection
  let socket = null;
  let gameState = {
    gameId: gameId,
    playerRole: null,
    player1: null,
    player2: null,
    goalTime: 0,
    currentRound: 1,
    scores: { player1: 0, player2: 0 },
    isMyTurn: false,
    clickStartTime: null,
    gameEnded: false
  };

  // DOM elements
  console.log('[DUEL] Getting DOM elements...');
  const pressButton = document.getElementById('pressButton');
  const pressTime = document.getElementById('pressTime');
  const roundNumber = document.getElementById('roundNumber');
  const goalValue = document.getElementById('goalValue');
  const player1Name = document.getElementById('player1');
  const player2Name = document.getElementById('player2');
  const scoreValue = document.getElementById('scoreValue');
  const opponentName = document.getElementById('opponentName');
  const turnStatus = document.getElementById('turnStatus');
  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const surrenderBtn = document.getElementById('surrenderBtn');

  console.log('[DUEL] DOM elements check:');
  console.log('  - pressButton:', pressButton ? '✓' : '✗');
  console.log('  - roundNumber:', roundNumber ? '✓' : '✗');
  console.log('  - goalValue:', goalValue ? '✓' : '✗');
  console.log('  - player1Name:', player1Name ? '✓' : '✗');
  console.log('  - player2Name:', player2Name ? '✓' : '✗');
  console.log('  - turnStatus:', turnStatus ? '✓' : '✗');

  // Modals
  const winnerPopup = document.getElementById('winnerPopup');
  const winnerTitle = document.getElementById('winnerTitle');
  const winnerDetails = document.getElementById('winnerDetails');
  const surrenderPopupBtn = document.getElementById('surrenderPopupBtn');
  const nextRoundBtn = document.getElementById('nextRoundBtn');
  const finalPopup = document.getElementById('finalPopup');
  const finalTitle = document.getElementById('finalTitle');
  const finalDetails = document.getElementById('finalDetails');
  const rematchBtn = document.getElementById('rematchBtn');

  /**
   * Get full avatar URL from relative path
   */
  function getAvatarUrl(avatarPath) {
    if (!avatarPath) return '/assets/images/profile.jpg';
    if (avatarPath.startsWith('http')) return avatarPath;
    // Avatar paths from backend can be 'avatars/xxx' or just 'xxx'
    if (avatarPath.includes('/')) {
      return `http://localhost:3000/uploads/${avatarPath}`;
    }
    return `http://localhost:3000/uploads/avatars/${avatarPath}`;
  }

  /**
   * Initialize Socket.IO connection
   */
  async function initSocket() {
    console.log('[DUEL] ======= Initializing Socket.IO =======');
    const token = sessionStorage.getItem('authToken');
    console.log('[DUEL] Auth token:', token ? 'Found' : 'NOT FOUND');
    
    if (!token) {
      console.error('[DUEL] ERROR: No auth token!');
      alert('Authentication required');
      window.location.href = '/pages/login.html';
      return;
    }

    // Check if Socket.IO is loaded
    if (!window.io) {
      console.error('[DUEL] ERROR: Socket.IO library not loaded!');
      alert('Socket.IO not loaded. Please refresh the page.');
      return;
    }

    console.log('[DUEL] Connecting to Socket.IO server...');
    // Connect to Socket.IO server
    socket = io('http://localhost:3000', {
      auth: { token: token }
    });

    console.log('[DUEL] Socket object created:', socket ? '✓' : '✗');

    // Connection events
    socket.on('connect', () => {
      console.log('[DUEL] ✓✓✓ CONNECTED to game server! ✓✓✓');
      console.log('[DUEL] Socket ID:', socket.id);
      console.log('[DUEL] Emitting join_game with gameId:', gameId);
      socket.emit('join_game', { gameId: gameId });
    });

    socket.on('connect_error', (error) => {
      console.error('[DUEL] ✗✗✗ CONNECTION ERROR ✗✗✗');
      console.error('[DUEL] Error details:', error);
      alert('Failed to connect to game server: ' + error.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[DUEL] Disconnected from server. Reason:', reason);
    });

    // Game events
    socket.on('game_joined', handleGameJoined);
    socket.on('player_connection_update', handlePlayerConnectionUpdate);
    socket.on('game_countdown_start', handleGameCountdownStart);
    socket.on('game_start', handleGameStart);
    socket.on('player_clicked', handlePlayerClicked);
    socket.on('round_finished', handleRoundFinished);
    socket.on('next_round_starting', handleNextRoundStarting);
    socket.on('game_finished', handleGameFinished);
    socket.on('game_ended_forfeit', handleGameEndedForfeit);
    socket.on('player_disconnected', handlePlayerDisconnected);
    socket.on('game_error', handleError);
  }

  /**
   * Handle game joined event
   */
  function handleGameJoined(data) {
    console.log('[DUEL] ======= Game joined event received =======');
    console.log('[DUEL] Full data:', JSON.stringify(data, null, 2));
    console.log('[DUEL] Player role:', data.playerRole);
    console.log('[DUEL] Game status:', data.game.status);
    console.log('[DUEL] Goal time:', data.game.goalTime);
    
    gameState.playerRole = data.playerRole;
    gameState.player1 = data.game.player1;
    gameState.player2 = data.game.player2;
    gameState.goalTime = data.game.goalTime;

    // Update UI
    player1Name.textContent = data.game.player1.username.toUpperCase();
    player2Name.textContent = data.game.player2.username.toUpperCase();
    // Display goal time in seconds (convert from milliseconds)
    const goalTimeSeconds = (data.game.goalTime / 1000).toFixed(1);
    goalValue.textContent = goalTimeSeconds + 's';
    console.log('[DUEL] Goal time display set to:', goalTimeSeconds + 's');
    roundNumber.textContent = '1';

    const opponent = gameState.playerRole === 'player1' ? data.game.player2 : data.game.player1;
    opponentName.textContent = opponent.username.toUpperCase();
    
    // Update opponent avatar
    const opponentAvatar = document.getElementById('opponentAvatar');
    if (opponentAvatar && opponent.avatar) {
      const avatarUrl = getAvatarUrl(opponent.avatar);
      opponentAvatar.src = avatarUrl;
      console.log('[DUEL] Setting opponent avatar:', avatarUrl);
    }

    updateTurnStatus('Waiting for opponent...');
    pressButton.disabled = true;
  }

  /**
   * Handle player connection update
   */
  function handlePlayerConnectionUpdate(data) {
    console.log('[DUEL] ======= Player connection update =======');
    console.log('[DUEL] Player 1 connected:', data.player1Connected);
    console.log('[DUEL] Player 2 connected:', data.player2Connected);
    console.log('[DUEL] Connected count:', data.connectedCount);
    
    if (data.player1Connected && data.player2Connected) {
      console.log('[DUEL] Both players connected! Game should start countdown soon...');
      updateTurnStatus('Both players connected! Starting soon...');
    } else {
      updateTurnStatus('Waiting for opponent to connect...');
    }
  }

  /**
   * Handle game countdown start
   */
  function handleGameCountdownStart(data) {
    console.log('[DUEL] ======= Countdown start event =======');
    console.log('[DUEL] Countdown data:', data);
    console.log('[DUEL] Goal time:', data.goalTime);
    console.log('[DUEL] Countdown time:', data.countdownTime);
    
    // Update goal time in case it changed for new round
    if (data.goalTime) {
      gameState.goalTime = data.goalTime;
      const goalTimeSeconds = (data.goalTime / 1000).toFixed(1);
      goalValue.textContent = goalTimeSeconds + 's';
      console.log('[DUEL] Updated goal time to:', goalTimeSeconds + 's');
    }
    
    // Visual countdown: 3... 2... 1...
    let count = 3;
    updateTurnStatus('Starting in ' + count + '...');
    
    const countdownInterval = setInterval(function() {
      count--;
      if (count > 0) {
        updateTurnStatus('Starting in ' + count + '...');
      } else {
        clearInterval(countdownInterval);
        updateTurnStatus('GET READY!');
      }
    }, 1000);
  }

  function handleGameStart(data) {
    console.log('[DUEL] ======= Game START event =======');
    console.log('[DUEL] Game start data:', data);
    console.log('[DUEL] Goal time:', data.goalTime);
    console.log('[DUEL] Game start time:', data.gameStartTime);
    
    // Game started! Enable button
    const goalSeconds = (data.goalTime / 1000).toFixed(1);
    updateTurnStatus('CLICK NOW! Try to hit ' + goalSeconds + 's!');
    pressButton.disabled = false;
    pressButton.classList.add('active');
    pressButton.classList.remove('pressed');
    console.log('[DUEL] Button enabled, waiting for player click');
    gameState.clickStartTime = Date.now();
  }

  /**
   * Handle player clicked
   */
  function handlePlayerClicked(data) {
    console.log('[DUEL] Player clicked:', data);
    
    pressButton.disabled = true;
    pressButton.classList.remove('active');
    
    // Display the time they clicked at
    const timeInSeconds = (data.clickTime / 1000).toFixed(3);
    const diffInMs = Math.abs(data.clickTime - data.goalTime);
    const diffInSeconds = (diffInMs / 1000).toFixed(3);
    
    updateTurnStatus(`Clicked at ${timeInSeconds}s (diff: ${diffInSeconds}s)`);
  }

  function handleRoundFinished(data) {
    console.log('[DUEL] Round finished:', data);
    pressButton.disabled = true;
    pressButton.classList.remove('active');
    gameState.scores = data.scores;
    scoreValue.textContent = data.scores.player1 + ' - ' + data.scores.player2;
    const roundWinnerName = data.roundWinner ? data.roundWinner.username : 'TIE';
    const player1TimeStr = data.player1.time ? (data.player1.time / 1000).toFixed(3) + 's' : 'N/A';
    const player2TimeStr = data.player2.time ? (data.player2.time / 1000).toFixed(3) + 's' : 'N/A';
    const goalTimeStr = (data.goalTime / 1000).toFixed(1) + 's';
    updateTurnStatus('Round ' + data.round + ' winner: ' + roundWinnerName + '! (Goal: ' + goalTimeStr + ', P1: ' + player1TimeStr + ', P2: ' + player2TimeStr + ')');
  }

  function handleNextRoundStarting(data) {
    console.log('[DUEL] Next round starting:', data);
    gameState.currentRound = data.round;
    roundNumber.textContent = data.round;
    gameState.goalTime = data.goalTime;
    goalValue.textContent = (data.goalTime / 1000).toFixed(1) + 's';
    scoreValue.textContent = data.scores.player1 + ' - ' + data.scores.player2;
    updateTurnStatus('Round ' + data.round + ' starting soon...');
    pressTime.textContent = '';
  }

  /**
   * Handle game finished
   */
  function handleGameFinished(data) {
    console.log('[DUEL] Game finished:', data);
    gameState.gameEnded = true;
    pressButton.disabled = true;
    pressButton.classList.remove('active');
    const finalWinnerName = data.winner ? data.winner.username : 'TIE';
    const finalScore = data.player1.score + ' - ' + data.player2.score;
    updateTurnStatus('GAME OVER! Winner: ' + finalWinnerName + ' (' + finalScore + ')');
    setTimeout(function() {
      alert('Game Over!\n\nWinner: ' + finalWinnerName + '\nFinal Score: ' + finalScore + '\n\nReturning to home...');
      window.location.href = '/pages/homeLogged.html';
    }, 3000);
  }

  function handleGameEndedForfeit(data) {
    console.log('[DUEL] Game ended by forfeit:', data);
    gameState.gameEnded = true;
    pressButton.disabled = true;
    alert('Opponent disconnected. You win by forfeit!');
    window.location.href = '/pages/homeLogged.html';
  }

  function handlePlayerDisconnected(data) {
    console.log('[DUEL] Player disconnected:', data);
    if (!gameState.gameEnded) {
      alert('Opponent disconnected. Game ended.');
      gameState.gameEnded = true;
      setTimeout(function() {
        window.location.href = '/pages/homeLogged.html';
      }, 2000);
    }
  }

  /**
   * Handle error
   */
  function handleError(data) {
    console.error('[DUEL] Error:', data);
    alert(data.message || 'An error occurred');
  }

  pressButton.addEventListener('click', function() {
    if (pressButton.disabled || gameState.gameEnded) return;
    console.log('[DUEL] Button clicked!');
    pressButton.classList.add('pressed');
    pressButton.disabled = true;
    socket.emit('player_click', {
      gameId: gameState.gameId
    });
    updateTurnStatus('Click registered! Waiting for opponent...');
  });

  function updateTurnStatus(text) {
    turnStatus.textContent = text;
  }

  function addToHistory(data) {
    if (historyEmpty) {
      historyEmpty.remove();
    }
    const li = document.createElement('li');
    li.className = 'history-item';
    const winner = data.winner === 'player1' ? gameState.player1.username : 
                   data.winner === 'player2' ? gameState.player2.username : 'Draw';
    li.innerHTML = '<strong>Round ' + data.round + '</strong><br>' +
      gameState.player1.username + ': ' + (data.player1Time ? data.player1Time.toFixed(3) : '-') + 's<br>' +
      gameState.player2.username + ': ' + (data.player2Time ? data.player2Time.toFixed(3) : '-') + 's<br>' +
      'Winner: ' + winner;
    historyList.insertBefore(li, historyList.firstChild);
  }

  function showRoundResult(data) {
    const isWinner = data.winner === gameState.playerRole;
    const isDraw = data.winner === 'draw';
    winnerTitle.textContent = isDraw ? 'Round Draw!' : 
                              isWinner ? 'You Won the Round!' : 'You Lost the Round';
    winnerDetails.innerHTML = '<strong>Round ' + data.round + ' Results:</strong><br>' +
      gameState.player1.username + ': ' + (data.player1Time ? data.player1Time.toFixed(3) : '-') + 's<br>' +
      gameState.player2.username + ': ' + (data.player2Time ? data.player2Time.toFixed(3) : '-') + 's<br><br>' +
      'Current Score: ' + data.scores.player1 + ' - ' + data.scores.player2;
    winnerPopup.style.display = 'flex';
  }

  /**
   * Show final result popup
   */
  function showFinalResult(data) {
    const isWinner = data.winner === gameState.playerRole;
    
    finalTitle.textContent = isWinner ? 'VICTORY!' : 'DEFEAT';
    finalDetails.innerHTML = `
      <strong>Final Score:</strong><br>
      ${gameState.player1.username}: ${data.finalScores.player1}<br>
      ${gameState.player2.username}: ${data.finalScores.player2}<br>
      <br>
      ${isWinner ? 'Congratulations!' : 'Better luck next time!'}
    `;
    
    finalPopup.style.display = 'flex';
  }

  /**
   * Handle surrender button
   */
  surrenderBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to surrender?')) {
      gameState.gameEnded = true;
      await cancelCurrentGame();
      socket.emit('leave_game', { gameId: gameState.gameId });
      socket.disconnect();
      window.location.href = '/pages/homeLogged.html';
    }
  });

  surrenderPopupBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to surrender?')) {
      gameState.gameEnded = true;
      await cancelCurrentGame();
      socket.emit('leave_game', { gameId: gameState.gameId });
      socket.disconnect();
      window.location.href = '/pages/homeLogged.html';
    }
  });

  /**
   * Handle next round button
   */
  nextRoundBtn.addEventListener('click', () => {
    winnerPopup.style.display = 'none';
    socket.emit('player_ready', { gameId: gameState.gameId });
  });

  /**
   * Handle rematch button
   */
  rematchBtn.addEventListener('click', () => {
    alert('Rematch feature coming soon!');
    window.location.href = '/pages/homeLogged.html';
  });

  /**
   * Cancel game via API
   */
  async function cancelCurrentGame() {
    if (!gameState.gameId) return;
    
    try {
      await window.api.delete(`/games/${gameState.gameId}`);
      console.log('[DUEL] Game cancelled successfully');
    } catch (error) {
      console.error('[DUEL] Failed to cancel game:', error);
    }
  }

  /**
   * Clean up on page unload
   * FORCE cancel game when window closes
   */
  window.addEventListener('beforeunload', function(e) {
    if (socket && gameState.gameId && !gameState.gameEnded) {
      console.log('[DUEL] Page unloading - FORCE CANCELLING GAME');
      
      // Use sendBeacon for reliable cleanup on page close
      const token = sessionStorage.getItem('authToken');
      if (token && navigator.sendBeacon) {
        const blob = new Blob(
          [JSON.stringify({ gameId: gameState.gameId })],
          { type: 'application/json' }
        );
        navigator.sendBeacon(
          'http://localhost:3000/api/games/' + gameState.gameId + '/force-end',
          blob
        );
      }
      
      // Also emit socket event
      socket.emit('leave_game', { gameId: gameState.gameId, forceEnd: true });
      socket.disconnect();
    }
  });

  // Handle page visibility change (user switches tabs)
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && socket && gameState.gameId && !gameState.gameEnded) {
      console.log('[DUEL] Page hidden, maintaining connection');
    }
  });

  // Initialize
  console.log('[DUEL] ======= Calling initSocket() =======');
  initSocket().then(function() {
    console.log('[DUEL] ======= initSocket() completed =======');
    console.log('[DUEL] ======= DUEL PAGE FULLY INITIALIZED =======');
  }).catch(function(error) {
    console.error('[DUEL] ✗✗✗ ERROR in initSocket() ✗✗✗');
    console.error('[DUEL] Error:', error);
    alert('Failed to initialize game: ' + error.message);
  });
});
