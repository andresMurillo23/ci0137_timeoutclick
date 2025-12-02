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
    currentUserId: null,
    player1: null,
    player2: null,
    goalTime: 0,
    currentRound: 1,
    scores: { player1: 0, player2: 0 },
    isMyTurn: false,
    clickStartTime: null,
    hasClicked: false,
    gameEnded: false,
    inactivityTimer: null
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
  const stillTherePopup = document.getElementById('stillTherePopup');
  const stillPlayingBtn = document.getElementById('stillPlayingBtn');
  const forfeitBtn = document.getElementById('forfeitBtn');

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
      auth: { token: token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
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
    socket.on('player_confirmed_next_round', handlePlayerConfirmedNextRound);
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
    
    // Store current user ID
    gameState.currentUserId = data.playerRole === 'player1' ? data.game.player1.id : data.game.player2.id;
    console.log('[DUEL] Current user ID:', gameState.currentUserId);

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
    console.log('[DUEL] Current round:', gameState.currentRound);
    
    // Game started! Enable button and reset click flag
    gameState.hasClicked = false;
    const goalSeconds = (data.goalTime / 1000).toFixed(1);
    updateTurnStatus('CLICK NOW! Try to hit ' + goalSeconds + 's!');
    
    console.log('[DUEL] Enabling button...');
    pressButton.disabled = false;
    pressButton.classList.add('active');
    gameState.clickStartTime = new Date(data.gameStartTime);
    
    // Start inactivity timer - show popup after goalTime if not clicked
    startInactivityTimer(data.goalTime);
  }
  
  /**
   * Start inactivity timer to check if player is still there
   */
  function startInactivityTimer(goalTime) {
    // Clear any existing timer
    if (gameState.inactivityTimer) {
      clearTimeout(gameState.inactivityTimer);
    }
    
    // Set timer to show popup after goalTime passes
    gameState.inactivityTimer = setTimeout(function() {
      // Only show if player hasn't clicked yet
      if (!gameState.hasClicked && !gameState.gameEnded) {
        console.log('[DUEL] Goal time passed without click - showing "still there" popup');
        showStillTherePopup();
      }
    }, goalTime);
  }
  
  /**
   * Clear inactivity timer
   */
  function clearInactivityTimer() {
    if (gameState.inactivityTimer) {
      clearTimeout(gameState.inactivityTimer);
      gameState.inactivityTimer = null;
    }
  }
  
  /**
   * Show "Are you still there?" popup
   */
  function showStillTherePopup() {
    stillTherePopup.style.display = 'flex';
    
    // Handle "I'm Still Here" button
    stillPlayingBtn.onclick = function() {
      console.log('[DUEL] Player confirmed they are still playing');
      stillTherePopup.style.display = 'none';
      updateTurnStatus('Click when ready!');
    };
    
    // Handle "Forfeit" button
    forfeitBtn.onclick = function() {
      console.log('[DUEL] Player chose to forfeit');
      stillTherePopup.style.display = 'none';
      handleSurrender();
    };
  }

  /**
   * Handle player clicked
   */
  function handlePlayerClicked(data) {
    console.log('[DUEL] Player clicked event received:', data);
    console.log('[DUEL] Click from player:', data.playerId);
    console.log('[DUEL] Current user ID:', gameState.currentUserId);
    console.log('[DUEL] Is this me?', data.playerId === gameState.currentUserId);
    
    const timeInSeconds = (data.clickTime / 1000).toFixed(3);
    const diffInMs = Math.abs(data.clickTime - data.goalTime);
    const diffInSeconds = (diffInMs / 1000).toFixed(3);
    
    // Only disable button if THIS player clicked
    if (data.playerId === gameState.currentUserId) {
      console.log('[DUEL] This is MY click - disabling button');
      pressButton.disabled = true;
      pressButton.classList.remove('active');
      pressButton.classList.add('pressed');
      gameState.hasClicked = true;
      updateTurnStatus(`You clicked at ${timeInSeconds}s (diff: ${diffInSeconds}s)`);
    } else {
      console.log('[DUEL] This is OPPONENT click - keeping button enabled');
      updateTurnStatus(`Opponent clicked at ${timeInSeconds}s. Your turn!`);
    }
  }

  function handleRoundFinished(data) {
    console.log('[DUEL] ======= Round finished! =======');
    console.log('[DUEL] Round data:', data);
    
    // Clear inactivity timer
    clearInactivityTimer();
    
    // Close "still there" popup if it's open
    if (stillTherePopup.style.display === 'flex') {
      stillTherePopup.style.display = 'none';
    }
    
    pressButton.disabled = true;
    pressButton.classList.remove('active');
    gameState.scores = data.scores;
    scoreValue.textContent = data.scores.player1 + ' - ' + data.scores.player2;
    
    const roundWinnerName = data.roundWinner ? data.roundWinner.username : 'TIE';
    const player1TimeStr = data.player1.time ? (data.player1.time / 1000).toFixed(3) + 's' : 'N/A';
    const player2TimeStr = data.player2.time ? (data.player2.time / 1000).toFixed(3) + 's' : 'N/A';
    const goalTimeStr = (data.goalTime / 1000).toFixed(1) + 's';
    
    updateTurnStatus('Round ' + data.round + ' winner: ' + roundWinnerName + '!');
    
    // Add to history
    console.log('[DUEL] Adding round to history...');
    addToHistory({
      round: data.round,
      player1Time: data.player1.time ? data.player1.time / 1000 : null,
      player2Time: data.player2.time ? data.player2.time / 1000 : null,
      winner: data.roundWinner ? (data.roundWinner.id === data.player1.id ? 'player1' : 'player2') : 'draw',
      goalTime: data.goalTime / 1000,
      scores: data.scores
    });
    
    // Show round result popup
    console.log('[DUEL] Showing round result popup...');
    showRoundResultPopup(data);
  }

  function handleNextRoundStarting(data) {
    console.log('[DUEL] ======= Next round starting! =======');
    console.log('[DUEL] Round:', data.round);
    console.log('[DUEL] New goal time:', data.goalTime);
    
    gameState.currentRound = data.round;
    gameState.hasClicked = false;
    roundNumber.textContent = data.round;
    gameState.goalTime = data.goalTime;
    goalValue.textContent = (data.goalTime / 1000).toFixed(1) + 's';
    scoreValue.textContent = data.scores.player1 + ' - ' + data.scores.player2;
    updateTurnStatus('Round ' + data.round + ' starting soon...');
    pressTime.textContent = '';
    
    // Keep button disabled until game_start event
    pressButton.disabled = true;
    pressButton.classList.remove('pressed');
    pressButton.classList.remove('active');
  }

  function handlePlayerConfirmedNextRound(data) {
    console.log('[DUEL] Player confirmed next round:', data);
    
    if (data.player1Ready && data.player2Ready) {
      updateTurnStatus('Both players ready! Starting next round...');
    } else if (data.player1Ready || data.player2Ready) {
      updateTurnStatus('Waiting for opponent to continue...');
    }
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
    
    // Show final result popup after a short delay
    setTimeout(function() {
      showFinalResultPopup(data);
    }, 1500);
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
    console.log('[DUEL] ======= Button clicked! =======');
    console.log('[DUEL] Button disabled?', pressButton.disabled);
    console.log('[DUEL] Game ended?', gameState.gameEnded);
    console.log('[DUEL] Has clicked?', gameState.hasClicked);
    console.log('[DUEL] Socket connected?', socket && socket.connected);
    
    if (pressButton.disabled || gameState.gameEnded) {
      console.log('[DUEL] Click ignored - button disabled or game ended');
      return;
    }
    
    if (gameState.hasClicked) {
      console.log('[DUEL] Click ignored - already clicked this round');
      return;
    }
    
    console.log('[DUEL] Emitting player_click to server...');
    console.log('[DUEL] Game ID:', gameState.gameId);
    
    pressButton.classList.add('pressed');
    pressButton.disabled = true;
    gameState.hasClicked = true;
    
    // Clear inactivity timer since player clicked
    clearInactivityTimer();
    
    // Close "still there" popup if it's open
    if (stillTherePopup.style.display === 'flex') {
      stillTherePopup.style.display = 'none';
    }
    
    socket.emit('player_click', {
      gameId: gameState.gameId
    });
    
    console.log('[DUEL] player_click event sent!');
    updateTurnStatus('Click registered! Waiting for opponent...');
  });

  function updateTurnStatus(text) {
    turnStatus.textContent = text;
  }

  function addToHistory(data) {
    console.log('[DUEL] Adding to history:', data);
    
    if (historyEmpty) {
      historyEmpty.remove();
    }
    
    const li = document.createElement('li');
    li.className = 'history-item';
    
    const winnerText = data.winner === 'player1' ? gameState.player1.username : 
                       data.winner === 'player2' ? gameState.player2.username : 
                       'TIE';
    
    const p1Time = data.player1Time !== null ? data.player1Time.toFixed(3) + 's' : 'N/A';
    const p2Time = data.player2Time !== null ? data.player2Time.toFixed(3) + 's' : 'N/A';
    const goal = data.goalTime !== null ? data.goalTime.toFixed(1) + 's' : 'N/A';
    
    li.innerHTML = '<strong>Round ' + data.round + '</strong> (Goal: ' + goal + ')<br>' +
      gameState.player1.username + ': ' + p1Time + '<br>' +
      gameState.player2.username + ': ' + p2Time + '<br>' +
      '<span style="color: #4CAF50;">Winner: ' + winnerText + '</span>';
    
    historyList.insertBefore(li, historyList.firstChild);
    console.log('[DUEL] History item added');
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
   * Show round result popup
   */
  function showRoundResultPopup(data) {
    const winnerPopup = document.getElementById('winnerPopup');
    const winnerTitle = document.getElementById('winnerTitle');
    const winnerDetails = document.getElementById('winnerDetails');
    const surrenderPopupBtn = document.getElementById('surrenderPopupBtn');
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    
    const roundWinnerName = data.roundWinner ? data.roundWinner.username : 'TIE';
    const player1Name = data.player1.username || gameState.player1.username;
    const player2Name = data.player2.username || gameState.player2.username;
    const player1TimeStr = data.player1.time ? (data.player1.time / 1000).toFixed(3) + 's' : 'N/A';
    const player2TimeStr = data.player2.time ? (data.player2.time / 1000).toFixed(3) + 's' : 'N/A';
    const goalTimeStr = (data.goalTime / 1000).toFixed(1) + 's';
    
    winnerTitle.textContent = 'Round ' + data.round + ' Results';
    winnerDetails.innerHTML = 
      '<strong>Winner: ' + roundWinnerName + '</strong><br><br>' +
      player1Name + ': ' + player1TimeStr + '<br>' +
      player2Name + ': ' + player2TimeStr + '<br>' +
      'Goal Time: ' + goalTimeStr + '<br><br>' +
      'Score: ' + data.scores.player1 + ' - ' + data.scores.player2;
    
    winnerPopup.style.display = 'flex';
    
    // Handle next round button
    nextRoundBtn.onclick = function() {
      console.log('[DUEL] Player clicked Next Round button');
      winnerPopup.style.display = 'none';
      updateTurnStatus('Waiting for opponent to continue...');
      
      // Emit ready for next round
      socket.emit('player_ready_for_next_round', {
        gameId: gameState.gameId
      });
    };
    
    // Handle surrender button
    surrenderPopupBtn.onclick = function() {
      winnerPopup.style.display = 'none';
      handleSurrender();
    };
  }
  
  /**
   * Show final result popup
   */
  function showFinalResultPopup(data) {
    const finalPopup = document.getElementById('finalPopup');
    const finalTitle = document.getElementById('finalTitle');
    const finalDetails = document.getElementById('finalDetails');
    const rematchBtn = document.getElementById('rematchBtn');
    const returnHomeBtn = document.getElementById('returnHomeBtn');
    
    const finalWinnerName = data.winner ? data.winner.username : 'TIE';
    const player1Name = data.player1.username || gameState.player1.username;
    const player2Name = data.player2.username || gameState.player2.username;
    const finalScore = data.player1.score + ' - ' + data.player2.score;
    
    finalTitle.textContent = 'Game Over!';
    finalDetails.innerHTML = 
      '<strong>Winner: ' + finalWinnerName + '</strong><br><br>' +
      'Final Score:<br>' +
      player1Name + ': ' + data.player1.score + '<br>' +
      player2Name + ': ' + data.player2.score;
    
    finalPopup.style.display = 'flex';
    
    // Handle rematch button
    rematchBtn.onclick = function() {
      finalPopup.style.display = 'none';
      // TODO: Implement rematch functionality
      alert('Rematch functionality coming soon!');
      window.location.href = '/pages/homeLogged.html';
    };
    
    // Return home button already has href in HTML
  }

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
