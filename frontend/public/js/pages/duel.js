/**
 * Duel page - Real-time game with Socket.IO
 * Handles click timing game between two players
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth || !window.auth.requireAuth()) {
    window.location.href = '/pages/login.html';
    return;
  }

  // Get game ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');

  if (!gameId) {
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
   * Initialize Socket.IO connection
   */
  async function initSocket() {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      alert('Authentication required');
      window.location.href = '/pages/login.html';
      return;
    }

    // Connect to Socket.IO server
    socket = io('http://localhost:3000', {
      auth: { token: token }
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[DUEL] Connected to game server');
      socket.emit('join_game', { gameId: gameId });
    });

    socket.on('connect_error', (error) => {
      console.error('[DUEL] Connection error:', error);
      alert('Failed to connect to game server');
    });

    // Game events
    socket.on('game_joined', handleGameJoined);
    socket.on('player_connection_update', handlePlayerConnectionUpdate);
    socket.on('game_countdown', handleGameCountdown);
    socket.on('game_started', handleGameStarted);
    socket.on('round_started', handleRoundStarted);
    socket.on('player_clicked', handlePlayerClicked);
    socket.on('round_ended', handleRoundEnded);
    socket.on('game_ended', handleGameEnded);
    socket.on('game_ended_forfeit', handleGameEndedForfeit);
    socket.on('player_disconnected', handlePlayerDisconnected);
    socket.on('game_error', handleError);
  }

  /**
   * Handle game joined event
   */
  function handleGameJoined(data) {
    console.log('[DUEL] Game joined:', data);
    
    gameState.playerRole = data.playerRole;
    gameState.player1 = data.game.player1;
    gameState.player2 = data.game.player2;
    gameState.goalTime = data.game.goalTime;

    // Update UI
    player1Name.textContent = data.game.player1.username.toUpperCase();
    player2Name.textContent = data.game.player2.username.toUpperCase();
    goalValue.textContent = data.game.goalTime + 's';
    roundNumber.textContent = '1';

    const opponent = gameState.playerRole === 'player1' ? data.game.player2 : data.game.player1;
    opponentName.textContent = opponent.username.toUpperCase();
    
    // Update opponent avatar
    const opponentAvatar = document.getElementById('opponentAvatar');
    if (opponentAvatar && opponent.avatar) {
      const avatarUrl = opponent.avatar.startsWith('http') ? 
        opponent.avatar : 
        `http://localhost:3000/uploads/avatars/${opponent.avatar}`;
      opponentAvatar.src = avatarUrl;
    }

    updateTurnStatus('Waiting for opponent...');
    pressButton.disabled = true;
  }

  /**
   * Handle player connection update
   */
  function handlePlayerConnectionUpdate(data) {
    console.log('[DUEL] Player connection update:', data);
    
    if (data.player1Connected && data.player2Connected) {
      updateTurnStatus('Both players connected!');
    }
  }

  /**
   * Handle game countdown
   */
  function handleGameCountdown(data) {
    console.log('[DUEL] Game countdown:', data);
    updateTurnStatus(`Game starting in ${data.countdown}...`);
  }

  /**
   * Handle game started
   */
  function handleGameStarted(data) {
    console.log('[DUEL] Game started:', data);
    updateTurnStatus('Game started!');
  }

  /**
   * Handle round started
   */
  function handleRoundStarted(data) {
    console.log('[DUEL] Round started:', data);
    
    gameState.currentRound = data.round;
    gameState.isMyTurn = data.currentPlayer === gameState.playerRole;
    
    roundNumber.textContent = data.round;
    pressTime.textContent = '';
    
    if (gameState.isMyTurn) {
      updateTurnStatus('Your Turn!');
      pressButton.disabled = false;
      turnStatus.classList.add('is-ready');
      turnStatus.classList.remove('is-waiting');
      
      // Start timer when button click is started
      gameState.clickStartTime = null;
    } else {
      updateTurnStatus('Opponent\'s Turn');
      pressButton.disabled = true;
      turnStatus.classList.remove('is-ready');
      turnStatus.classList.add('is-waiting');
    }
  }

  /**
   * Handle player clicked
   */
  function handlePlayerClicked(data) {
    console.log('[DUEL] Player clicked:', data);
    
    if (!gameState.isMyTurn) {
      updateTurnStatus(`Opponent clicked in ${data.time.toFixed(3)}s`);
    }
  }

  /**
   * Handle round ended
   */
  function handleRoundEnded(data) {
    console.log('[DUEL] Round ended:', data);
    
    // Update scores
    gameState.scores = data.scores;
    scoreValue.textContent = `${data.scores.player1} - ${data.scores.player2}`;
    
    // Add to history
    addToHistory(data);
    
    // Show round result popup
    showRoundResult(data);
  }

  /**
   * Handle game ended
   */
  function handleGameEnded(data) {
    console.log('[DUEL] Game ended:', data);
    
    gameState.gameEnded = true;
    pressButton.disabled = true;
    
    // Close round popup if open
    winnerPopup.style.display = 'none';
    
    // Show final result
    showFinalResult(data);
  }

  /**
   * Handle game ended by forfeit
   */
  function handleGameEndedForfeit(data) {
    console.log('[DUEL] Game ended by forfeit:', data);
    gameState.gameEnded = true;
    pressButton.disabled = true;
    
    alert('Opponent disconnected. You win by forfeit!');
    window.location.href = '/pages/homeLogged.html';
  }

  /**
   * Handle player disconnected
   */
  function handlePlayerDisconnected(data) {
    console.log('[DUEL] Player disconnected:', data);
    
    if (!gameState.gameEnded) {
      alert('Opponent disconnected. Game ended.');
      gameState.gameEnded = true;
      setTimeout(() => {
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

  /**
   * Handle click button press
   */
  pressButton.addEventListener('mousedown', () => {
    if (!gameState.isMyTurn || gameState.clickStartTime) return;
    
    gameState.clickStartTime = Date.now();
    pressButton.classList.add('pressed');
  });

  pressButton.addEventListener('mouseup', () => {
    if (!gameState.isMyTurn || !gameState.clickStartTime) return;
    
    const clickTime = (Date.now() - gameState.clickStartTime) / 1000;
    pressButton.classList.remove('pressed');
    
    // Display time
    pressTime.textContent = clickTime.toFixed(3) + 's';
    
    // Send click to server
    socket.emit('player_click', {
      gameId: gameState.gameId,
      time: clickTime
    });
    
    gameState.clickStartTime = null;
    pressButton.disabled = true;
    updateTurnStatus('Waiting for opponent...');
  });

  // Handle mouse leave (cancel click)
  pressButton.addEventListener('mouseleave', () => {
    if (gameState.clickStartTime) {
      pressButton.classList.remove('pressed');
      gameState.clickStartTime = null;
    }
  });

  /**
   * Update turn status display
   */
  function updateTurnStatus(text) {
    turnStatus.textContent = text;
  }

  /**
   * Add round to history
   */
  function addToHistory(data) {
    if (historyEmpty) {
      historyEmpty.remove();
    }
    
    const li = document.createElement('li');
    li.className = 'history-item';
    
    const winner = data.winner === 'player1' ? gameState.player1.username : 
                   data.winner === 'player2' ? gameState.player2.username : 'Draw';
    
    li.innerHTML = `
      <strong>Round ${data.round}</strong><br>
      ${gameState.player1.username}: ${data.player1Time?.toFixed(3) || '-'}s<br>
      ${gameState.player2.username}: ${data.player2Time?.toFixed(3) || '-'}s<br>
      Winner: ${winner}
    `;
    
    historyList.insertBefore(li, historyList.firstChild);
  }

  /**
   * Show round result popup
   */
  function showRoundResult(data) {
    const isWinner = data.winner === gameState.playerRole;
    const isDraw = data.winner === 'draw';
    
    winnerTitle.textContent = isDraw ? 'Round Draw!' : 
                              isWinner ? 'You Won the Round!' : 'You Lost the Round';
    
    winnerDetails.innerHTML = `
      <strong>Round ${data.round} Results:</strong><br>
      ${gameState.player1.username}: ${data.player1Time?.toFixed(3) || '-'}s<br>
      ${gameState.player2.username}: ${data.player2Time?.toFixed(3) || '-'}s<br>
      <br>
      Current Score: ${data.scores.player1} - ${data.scores.player2}
    `;
    
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
   */
  window.addEventListener('beforeunload', async (e) => {
    if (socket && gameState.gameId && !gameState.gameEnded) {
      // Cancel game if still active
      await cancelCurrentGame();
      socket.emit('leave_game', { gameId: gameState.gameId });
      socket.disconnect();
    }
  });

  // Handle page visibility change (user switches tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && socket && gameState.gameId && !gameState.gameEnded) {
      console.log('[DUEL] Page hidden, maintaining connection');
    }
  });

  // Initialize
  await initSocket();
});
