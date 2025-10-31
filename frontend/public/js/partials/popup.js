document.addEventListener("DOMContentLoaded", () => {

  const overlay  = document.getElementById("confirmOverlay");
  const dialog   = overlay?.querySelector(".dialog");
  const who      = document.getElementById("who");
  const whoWaiting = document.getElementById("whoWaiting");

  const panelConfirm = document.getElementById("panelConfirm");
  const panelWaiting = document.getElementById("panelWaiting");

  const noBtn    = document.getElementById("noBtn");
  const yesBtn   = document.getElementById("yesBtn");
  const cancelWaitBtn = document.getElementById("cancelWaitBtn");

  let lastTrigger = null;
  let opponent = "";
  let waitTimer = null;

  if (!overlay || !dialog) return;

  function setState(state) {
    if (state === "confirm") {
      panelConfirm.hidden = false;
      panelWaiting.hidden = true;
      dialog.focus();
    } else if (state === "waiting") {
      panelConfirm.hidden = true;
      panelWaiting.hidden = false;
      dialog.focus();
    }
  }

  function openModal(fromBtn) {
    lastTrigger = fromBtn || null;
    const row = fromBtn?.closest(".row, .friend-card");
    opponent = (row?.querySelector(".username, .user-name")?.textContent || "").trim();
    who.textContent = opponent || "Player";
    whoWaiting.textContent = opponent || "Player";

    setState("confirm");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => dialog.focus(), 0);
  }

  function closeModal() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    clearTimeout(waitTimer);
    waitTimer = null;
    lastTrigger?.focus();
  }

  // Delegación: solo abre para filas disponibles y botón no deshabilitado
// Delegación: abrir modal desde diferentes estructuras compatibles
  document.addEventListener("click", (e) => {
    // Selector original (listas tipo tabla)
    let btn = e.target.closest(".list .row.available .action .btn");

    // Selector adicional (tarjetas tipo friend-card)
    if (!btn) {
      btn = e.target.closest(".friend-card.available button.btn--secondary");
    }

    if (!btn) return;
    openModal(btn);
  });

  // NO -> cierra
  noBtn?.addEventListener("click", closeModal);

  // YES -> muestra "waiting"
  yesBtn?.addEventListener("click", async () => {
    setState("waiting");

    waitTimer = setTimeout(() => {
      window.location.assign('/pages/duel.html');

    }, 4000);
  });

  // Cancelar espera
  cancelWaitBtn?.addEventListener("click", () => {
    // TODO: cancelar challenge en backend si aplica
    closeModal();
  });

  // Cerrar con clic fuera
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });
});
