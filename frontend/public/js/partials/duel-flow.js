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
let isCounting = false;

// ==== EVENTOS PRINCIPALES ====
surrenderBtn.addEventListener("click", () => showFinalPopup("Surrender"));
nextRoundBtn.addEventListener("click", nextRound);
rematchBtn.addEventListener("click", resetGame);
returnHomeBtn.addEventListener("click", () => (window.location.href = "/"));
surrenderPopupBtn.addEventListener("click", () => showFinalPopup("Surrender"));
window.addEventListener("load", startNewRoundAnimation);

// ==== CICLO DE RONDA ====
function startNewRoundAnimation() {
  const span = pressBtn.querySelector("span");
  span.textContent = "";
  span.className = "";
  pressBtn.disabled = true;
  pressTimeDisplay.textContent = "";

  // Enfasis visual en el GOAL TIME
  goalValue.classList.add("goal-highlight");
  setTimeout(() => {
    goalValue.classList.remove("goal-highlight");
    startCountdown();
  }, 1200);
}

// ==== CONTEO 3,2,1,CLICK ====
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

      // Activar click solo una vez
      pressBtn.addEventListener("click", handleClickOnce, { once: true });
    }
  }, 1000);
}

// ==== CUANDO SE HACE CLICK ====
function handleClickOnce() {
  pressBtn.disabled = true;

  // Mantiene el texto "CLICK!" visible
  const span = pressBtn.querySelector("span");
  span.textContent = "CLICK!";
  span.classList.remove("ready");
  span.style.opacity = "0.9";

  // Muestra "Measuring..." debajo del botón
  pressTimeDisplay.textContent = "Measuring...";

  // Simular tiempos
  const simulatedPressPlayer = (Math.random() * 3 + 1).toFixed(2);
  const simulatedPressOpponent = (Math.random() * 3 + 1).toFixed(2);

  // Esperar un momento y luego mostrar resultados
  setTimeout(() => {
    showPressTime(simulatedPressPlayer);
    const winner =
      parseFloat(simulatedPressPlayer) >= parseFloat(simulatedPressOpponent)
        ? "PLAYER541"
        : "PLAYER642";

    updateScores(winner);
    updateHistory(winner, simulatedPressPlayer, simulatedPressOpponent);
    showRoundPopup(winner, simulatedPressPlayer, simulatedPressOpponent);
  }, 1000 + Math.random() * 600);
}

// ==== FUNCIONES BASE ====
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

// ==== POPUP DE RESULTADOS ====
function showRoundPopup(winner, t1, t2) {
  winnerTitle.textContent = `Round ${round} Results`;
  winnerDetails.innerHTML = `
    <strong>Player541:</strong> ${t1}s<br>
    <strong>Player642:</strong> ${t2}s<br><br>
    <b>${winner} wins this round!</b>
  `;
  winnerPopup.classList.add("active");
}

// ==== SIGUIENTE RONDA ====
function nextRound() {
  winnerPopup.classList.remove("active");
  round++;
  if (round > totalRounds) {
    showFinalPopup();
    return;
  }

  // Nuevo goal time y reinicio visual
  goalTime = 3 + Math.floor(Math.random() * 4);
  goalValue.textContent = `${goalTime}s`;
  roundNumber.textContent = round;

  const span = pressBtn.querySelector("span");
  span.textContent = "";
  span.className = "";
  pressBtn.disabled = true;
  pressBtn.style.opacity = "1";

  pressTimeDisplay.textContent = "";
  startNewRoundAnimation();
}

// ==== FINAL DEL JUEGO ====
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

// ==== REINICIAR PARTIDA ====
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
