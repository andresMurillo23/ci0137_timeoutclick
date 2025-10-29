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
    const row = fromBtn?.closest(".row");
    opponent = (row?.querySelector(".username")?.textContent || "").trim();
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
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".list .row.available .action .btn");
    if (!btn) return;
    openModal(btn);
  });

  // NO -> cierra
  noBtn?.addEventListener("click", closeModal);

  // YES -> muestra "waiting"
  yesBtn?.addEventListener("click", async () => {
    setState("waiting");
    // TODO: aquí integra tu lógica real:
    // await sendChallenge(opponent);
    // await waitForResponse(opponent);

    // DEMO: simular respuesta en 4s. Cambia por tu promesa real.
    waitTimer = setTimeout(() => {
      // p.ej. navegar a la sala de juego:
      // location.href = `/pages/versus.html?opponent=${encodeURIComponent(opponent)}`;
      closeModal();
      // O en lugar de cerrar, muestra un "accepted" / "declined".
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
