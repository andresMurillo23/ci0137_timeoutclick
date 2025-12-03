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

// 3-2-1-CLICK countdown
function startCountdown() {
  isCounting = true;
  let count = 3;
  const span = pressBtn.querySelector("span");
  span.textContent = count;
  span.classList.add("countdown");

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      span.textContent = count;
    } else if (count === 0) {
      span.textContent = "CLICK!"; 
      span.classList.remove("countdown");
      span.classList.add("ready");
      clearInterval(interval);
      pressBtn.disabled = false;
      isCounting = false;
      pressBtn.addEventListener("click", handleClickOnce, { once: true });
    }
  }, 1000);
}

// Handle the single click for this round
function handleClickOnce() {
  pressBtn.disabled = true;

  const span = pressBtn.querySelector("span");
  span.textContent = "CLICK!";
  span.classList.remove("ready");
  span.style.opacity = "0.9";

  pressTimeDisplay.textContent = "Measuring..."; // feedback while computing

  // Simulated times
  const simulatedPressPlayer = (Math.random() * 3 + 1).toFixed(2);
  const simulatedPressOpponent = (Math.random() * 3 + 1).toFixed(2);

  // Show result after short delay
  setTimeout(() => {
    showPressTime(simulatedPressPlayer);

    // current rule: tie goes to PLAYER541 (>=)
    const winner =
      parseFloat(simulatedPressPlayer) >= parseFloat(simulatedPressOpponent)
        ? "PLAYER541"
        : "PLAYER642";

    updateScores(winner);
    updateHistory(winner, simulatedPressPlayer, simulatedPressOpponent);
    showRoundPopup(winner, simulatedPressPlayer, simulatedPressOpponent);
  }, 1000 + Math.random() * 600);
}

// Update the "your press time" label
function showPressTime(time) {
  pressTimeDisplay.textContent = `Your Press Time: ${time}s`;
}

// Update scores and scoreboard text
function updateScores(winner) {
  if (winner === "PLAYER541") score1++;
  else score2++;
  scoreValue.textContent = `${score1} - ${score2}`;
}

// Append round summary to history list
function updateHistory(winner, t1, t2) {
  const li = document.createElement("li");
  li.classList.add("history-item");
  if (winner === "PLAYER541") {
    li.classList.add("win");
    li.textContent = `R${round}: You won (${t1}s vs ${t2}s)`;
  } else {
    li.classList.add("loss");
    li.textContent = `R${round}: You lost (${t1}s vs ${t2}s)`;
  }
  historyList.appendChild(li);
}

// Open round results popup with both times
function showRoundPopup(winner, t1, t2) {
  winnerTitle.textContent = `Round ${round} Results`;
  winnerDetails.innerHTML = `
    <strong>Player541:</strong> ${t1}s<br>
    <strong>Player642:</strong> ${t2}s<br><br>
    <b>${winner} wins this round!</b>
  `;
  winnerPopup.classList.add("active");
}

// Go to next round or finish if last one
function nextRound() {
  winnerPopup.classList.remove("active");
  round++;
  if (round > totalRounds) {
    showFinalPopup();
    return;
  }

  // random next goal time (3–6s)
  goalTime = 3 + Math.floor(Math.random() * 4);
  goalValue.textContent = `${goalTime}s`;
  roundNumber.textContent = round;

  // reset button state
  const span = pressBtn.querySelector("span");
  span.textContent = "";
  span.className = "";
  pressBtn.disabled = true;
  pressBtn.style.opacity = "1";

  pressTimeDisplay.textContent = "";
  startNewRoundAnimation();
}

// Show final popup (or surrender)
function showFinalPopup(reason) {
  finalPopup.classList.add("active");
  let winnerFinal;
  if (score1 > score2) winnerFinal = "PLAYER541";
  else if (score2 > score1) winnerFinal = "PLAYER642";
  else winnerFinal = "Tie";

  finalTitle.textContent =
    reason === "Surrender" ? "You Surrendered!" : "Final Results";
  finalDetails.innerHTML = `
    <strong>Final Score:</strong> ${score1} - ${score2}<br>
    <strong>Winner:</strong> ${winnerFinal}
  `;
}

// Reset state and UI to initial values
function resetGame() {
  finalPopup.classList.remove("active");
  winnerPopup.classList.remove("active");
  historyList.innerHTML = "";
  score1 = 0;
  score2 = 0;
  round = 1;
  roundNumber.textContent = round;
  scoreValue.textContent = "0 - 0";
  goalValue.textContent = "4s";
  pressTimeDisplay.textContent = "";
  startNewRoundAnimation();
}
