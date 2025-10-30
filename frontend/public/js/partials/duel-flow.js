// ==== ELEMENTOS DEL DOM ====
const pressBtn = document.getElementById("pressButton");
const pressTimeDisplay = document.getElementById("pressTime");
const historyList = document.getElementById("historyList");
const scoreValue = document.getElementById("scoreValue");
const roundNumber = document.getElementById("roundNumber");
const goalValue = document.getElementById("goalValue");

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

// ==== VARIABLES ====
let round = 1;
const totalRounds = 3;
let score1 = 0;
let score2 = 0;
let goalTime = 4;

// ==== EVENTO PRINCIPAL ====
pressBtn.addEventListener("click", startRound);
surrenderBtn.addEventListener("click", () => showFinalPopup("Surrender"));

// ==== FUNCIONES ====
function startRound() {
  pressBtn.disabled = true;
  pressTimeDisplay.textContent = "Measuring...";
  const simulatedPressPlayer = (Math.random() * 3 + 1).toFixed(2);
  const simulatedPressOpponent = (Math.random() * 3 + 1).toFixed(2);

  setTimeout(() => {
    showPressTime(simulatedPressPlayer);
    const winner =
      parseFloat(simulatedPressPlayer) <= parseFloat(simulatedPressOpponent)
        ? "PLAYER541"
        : "PLAYER642";
    updateScores(winner);
    updateHistory(winner, simulatedPressPlayer, simulatedPressOpponent);
    showRoundPopup(winner, simulatedPressPlayer, simulatedPressOpponent);
  }, 800 + Math.random() * 700);
}

function showPressTime(time) {
  pressTimeDisplay.textContent = `Your Press Time: ${time}s`;
}

function updateScores(winner) {
  if (winner === "PLAYER541") score1++;
  else score2++;
  scoreValue.textContent = `${score1} - ${score2}`;
}

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

function showRoundPopup(winner, t1, t2) {
  winnerTitle.textContent = `Round ${round} Results`;
  winnerDetails.innerHTML = `
    <strong>Player541:</strong> ${t1}s<br>
    <strong>Player642:</strong> ${t2}s<br><br>
    <b>${winner} wins this round!</b>
  `;
  winnerPopup.classList.add("active");
}

// ==== CONTROLES POPUP ====
nextRoundBtn.addEventListener("click", () => {
  winnerPopup.classList.remove("active");
  round++;
  if (round > totalRounds) {
    showFinalPopup();
    return;
  }
  goalTime = 3 + Math.floor(Math.random() * 4);
  goalValue.textContent = `${goalTime}s`;
  roundNumber.textContent = round;
  pressTimeDisplay.textContent = "";
  pressBtn.disabled = false;
});

surrenderPopupBtn.addEventListener("click", () => {
  winnerPopup.classList.remove("active");
  showFinalPopup("Surrender");
});

// ==== FINAL ====
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

rematchBtn.addEventListener("click", resetGame);
returnHomeBtn.addEventListener("click", () => (window.location.href = "/"));

function resetGame() {
  finalPopup.classList.remove("active");
  historyList.innerHTML = "";
  score1 = 0;
  score2 = 0;
  round = 1;
  roundNumber.textContent = round;
  scoreValue.textContent = "0 - 0";
  goalValue.textContent = "4s";
  pressTimeDisplay.textContent = "";
  pressBtn.disabled = false;
}
