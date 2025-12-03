// DOM elements
const pressBtn = document.getElementById("pressButton");
const pressTimeDisplay = document.getElementById("pressTime");
const historyList = document.getElementById("historyList");
const scoreValue = document.getElementById("scoreValue");
const roundNumber = document.getElementById("roundNumber");
const goalValue = document.getElementById("goalValue");
const opponentName = document.getElementById("opponentName");
const player1Name = document.getElementById("player1");
const player2Name = document.getElementById("player2");

// Popups
const winnerPopup = document.getElementById("winnerPopup");
const winnerTitle = document.getElementById("winnerTitle");
const winnerDetails = document.getElementById("winnerDetails");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const surrenderPopupBtn = document.getElementById("surrenderPopupBtn");
const finalPopup = document.getElementById("finalPopup");
const finalTitle = document.getElementById("finalTitle");
const finalDetails = document.getElementById("finalDetails");
const rematchBtn = document.getElementById("rematchBtn");
const returnHomeBtn = document.getElementById("returnHomeBtn");
const surrenderBtn = document.getElementById("surrenderBtn");

// Game state
let currentGame = null;
let currentUser = null;
let opponent = null;
let gameStartTime = null;
let goalTime = null;
let isGameActive = false;
let hasClicked = false;
let gameHistory = [];
let myScore = 0;
let opponentScore = 0;

// Initialize game page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!window.auth.requireAuth()) return;
  
  currentUser = window.auth.getCurrentUser();
  
  // Get game ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');
  
  if (!gameId) {
    window.PopupManager.error('Error', 'No se especificó ningún juego');
    setTimeout(() => {
      window.location.href = '/pages/homeLogged.html';
    }, 1500);
    return;
  }

  try {
    // Connect to game server
    await window.gameManager.connect();
    
    // Join the specific game
    currentGame = await window.gameManager.joinGame(gameId);
    
    setupGameUI();
    setupGameHandlers();
    setupEventListeners();
    
    console.log('Game initialized:', currentGame);
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
    window.PopupManager.error('Error de Conexión', 'No se pudo conectar al juego. Por favor, inténtalo de nuevo.');
    setTimeout(() => {
      window.location.href = '/pages/homeLogged.html';
    }, 2000);
  }
});

// Setup game UI with player info
function setupGameUI() {
  if (!currentGame || !currentUser) return;
  
  // Find opponent
  opponent = currentGame.players.find(p => p._id !== currentUser._id);
  
  // Update player names
  player1Name.textContent = currentUser.username || 'You';
  player2Name.textContent = opponent ? opponent.username : 'Waiting...';
  opponentName.textContent = opponent ? opponent.username : 'Waiting for opponent...';
  
  // Initialize scores
  scoreValue.textContent = '0 - 0';
  roundNumber.textContent = '1';
  
  // Update game status
  updateGameStatus('Waiting for opponent...');
}

// Setup Socket.IO game event handlers
function setupGameHandlers() {
  // Game start event
  window.gameManager.on('gameStart', (data) => {
    console.log('Game starting...', data);
    isGameActive = true;
    hasClicked = false;
    gameStartTime = Date.now();
    
    updateGameStatus('Game starting...');
    startCountdownAnimation();
  });

  // Goal time set
  window.gameManager.on('goalTimeSet', (data) => {
    console.log('Goal time set:', data.goalTime);
    goalTime = data.goalTime;
    goalValue.textContent = `${goalTime}s`;
    
    // Highlight goal time
    goalValue.classList.add("goal-highlight");
    setTimeout(() => {
      goalValue.classList.remove("goal-highlight");
    }, 1000);
    
    updateGameStatus('Click STOP as close to the goal time as possible!');
    enableClickButton();
  });

  // Player click event
  window.gameManager.on('playerClick', (data) => {
    console.log('Player clicked:', data);
    
    const isCurrentUser = data.playerId === currentUser._id;
    const playerName = isCurrentUser ? 'You' : opponent?.username || 'Opponent';
    const clickTime = (data.clickTime / 1000).toFixed(3);
    
    addToHistory(`${playerName} clicked at ${clickTime}s`);
    
    if (isCurrentUser) {
      pressTimeDisplay.textContent = `Your time: ${clickTime}s`;
    }
  });

  // Game finished
  window.gameManager.on('gameEnd', (data) => {
    console.log('Game finished:', data);
    isGameActive = false;
    pressBtn.disabled = true;
    
    showGameResults(data);
  });

  // Opponent disconnected
  window.gameManager.on('opponentDisconnected', (data) => {
    console.log('Opponent disconnected:', data);
    updateGameStatus('Opponent disconnected. You win by default!');
    
    setTimeout(() => {
      showFinalPopup('Opponent Disconnected', 'You win by forfeit!');
    }, 2000);
  });

  // Game error
  window.gameManager.on('error', (data) => {
    console.error('Game error:', data);
    window.PopupManager.error('Error de Juego', data.message || 'Ha ocurrido un error en el juego');
  });
}

// Setup UI event listeners
function setupEventListeners() {
  surrenderBtn.addEventListener("click", handleSurrender);
  nextRoundBtn.addEventListener("click", closeWinnerPopup);
  rematchBtn.addEventListener("click", handleRematch);
  returnHomeBtn.addEventListener("click", () => {
    window.location.href = '/pages/homeLogged.html';
  });
  surrenderPopupBtn.addEventListener("click", handleSurrender);
  
  // Handle click button press
  pressBtn.addEventListener("click", handlePlayerClick);
}

// Start countdown animation
function startCountdownAnimation() {
  const span = pressBtn.querySelector("span");
  let count = 3;
  
  pressBtn.disabled = true;
  span.className = "countdown";

  const countdown = setInterval(() => {
    span.textContent = count;
    count--;

    if (count === 0) {
      clearInterval(countdown);
      // Wait for goal time from server
      span.textContent = "WAITING...";
      updateGameStatus('Waiting for goal time...');
    }
  }, 1000);
}

// Enable click button when goal time is set
function enableClickButton() {
  const span = pressBtn.querySelector("span");
  span.textContent = "STOP";
  span.className = "ready";
  pressBtn.disabled = false;
  hasClicked = false;
  
  // Start time display
  startTimeDisplay();
}

// Start the time display ticker
function startTimeDisplay() {
  if (!gameStartTime) return;
  
  const ticker = setInterval(() => {
    if (!isGameActive || hasClicked) {
      clearInterval(ticker);
      return;
    }
    
    const elapsed = (Date.now() - gameStartTime) / 1000;
    pressTimeDisplay.textContent = `${elapsed.toFixed(2)}s`;
  }, 10);
}

// Handle click button press
function handlePlayerClick() {
  if (!isGameActive || hasClicked || !gameStartTime) return;
  
  hasClicked = true;
  pressBtn.disabled = true;
  
  const clickTime = Date.now() - gameStartTime;
  const span = pressBtn.querySelector("span");
  span.textContent = "CLICKED";
  span.className = "clicked";
  
  // Send click to server
  window.gameManager.playerClick(clickTime);
  
  updateGameStatus('Waiting for other player...');
}

// Show game results
function showGameResults(gameData) {
  const { winner, playerResults, gameStats } = gameData;
  
  // Update scores
  if (winner && winner._id === currentUser._id) {
    myScore++;
  } else if (winner) {
    opponentScore++;
  }
  
  scoreValue.textContent = `${myScore} - ${opponentScore}`;
  
  // Show round results
  const myResult = playerResults.find(p => p.playerId === currentUser._id);
  const opponentResult = playerResults.find(p => p.playerId !== currentUser._id);
  
  let roundResult = 'Tie!';
  if (winner) {
    roundResult = winner._id === currentUser._id ? 'You won!' : `${opponent?.username || 'Opponent'} won!`;
  }
  
  showWinnerPopup(roundResult, myResult, opponentResult);
}

// Show winner popup
function showWinnerPopup(result, myResult, opponentResult) {
  winnerPopup.classList.add("active");
  winnerTitle.textContent = result;
  
  const myTime = myResult ? (myResult.clickTime / 1000).toFixed(3) : 'N/A';
  const opponentTime = opponentResult ? (opponentResult.clickTime / 1000).toFixed(3) : 'N/A';
  const goalTimeText = goalTime ? `${goalTime}s` : 'N/A';
  
  winnerDetails.innerHTML = `
    <strong>Goal Time:</strong> ${goalTimeText}<br>
    <strong>Your Time:</strong> ${myTime}s<br>
    <strong>Opponent Time:</strong> ${opponentTime}s<br>
    <strong>Current Score:</strong> ${myScore} - ${opponentScore}
  `;
}

// Close winner popup and continue
function closeWinnerPopup() {
  winnerPopup.classList.remove("active");
  updateGameStatus('Waiting for next round...');
}

// Handle surrender
async function handleSurrender() {
  const confirmed = await window.PopupManager.confirm(
    '¿Rendirse?',
    '¿Estás seguro de que quieres rendirte? Perderás el juego.',
    { danger: true, confirmText: 'Rendirse', cancelText: 'Continuar' }
  );
  
  if (confirmed) {
    window.gameManager.forfeitGame();
    showFinalPopup('Game Surrendered', 'You forfeited the game.');
  }
}

// Handle rematch request
function handleRematch() {
  if (opponent) {
    // In a real implementation, this would send a rematch request
    window.PopupManager.success('Próximamente', '¡La función de revancha estará disponible pronto!', 2000);
    setTimeout(() => {
      window.location.href = '/pages/homeLogged.html';
    }, 2000);
  } else {
    window.location.href = '/pages/homeLogged.html';
  }
}

// Show final popup
function showFinalPopup(title, message) {
  finalPopup.classList.add("active");
  finalTitle.textContent = title;
  finalDetails.innerHTML = `
    <strong>Final Score:</strong> ${myScore} - ${opponentScore}<br>
    ${message}
  `;
}

// Update game status message
function updateGameStatus(message) {
  // You can add a status element to show current game state
  console.log('Game Status:', message);
}

// Add to history list
function addToHistory(message) {
  if (!historyList) return;
  
  const li = document.createElement('li');
  li.textContent = message;
  historyList.appendChild(li);
  
  // Keep history scrolled to bottom
  historyList.scrollTop = historyList.scrollHeight;
}

// Close modal when clicking outside
[winnerPopup, finalPopup].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
});

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (winnerPopup && winnerPopup.classList.contains('active')) {
      winnerPopup.classList.remove('active');
    }
    if (finalPopup && finalPopup.classList.contains('active')) {
      finalPopup.classList.remove('active');
    }
  }
});