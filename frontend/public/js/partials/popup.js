document.addEventListener("DOMContentLoaded", () => {
  // Core elements
  const overlay  = document.getElementById("confirmOverlay");
  const dialog   = overlay?.querySelector(".dialog");
  const who      = document.getElementById("who");
  const whoWaiting = document.getElementById("whoWaiting");

  // Panels (confirm vs waiting)
  const panelConfirm = document.getElementById("panelConfirm");
  const panelWaiting = document.getElementById("panelWaiting");

  // Buttons
  const noBtn    = document.getElementById("noBtn");
  const yesBtn   = document.getElementById("yesBtn");
  const cancelWaitBtn = document.getElementById("cancelWaitBtn");

  // Local state
  let lastTrigger = null;
  let opponent = "";
  let waitTimer = null;

  if (!overlay || !dialog) return;

  // Toggle between confirm and waiting panels
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

  // Open modal and populate opponent name
  function openModal(fromBtn) {
    lastTrigger = fromBtn || null;
    const row = fromBtn?.closest(".row, .friend-card"); // support both lists
    opponent = (row?.querySelector(".username, .user-name")?.textContent || "").trim();
    who.textContent = opponent || "Player";
    whoWaiting.textContent = opponent || "Player";

    setState("confirm");
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => dialog.focus(), 0);
  }

  // Close modal and cleanup timer/focus
  function closeModal() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    clearTimeout(waitTimer);
    waitTimer = null;
    lastTrigger?.focus(); // return focus to trigger
  }

  // Delegate clicks that should open the modal (challenge actions)
  document.addEventListener("click", (e) => {
    let btn =
      e.target.closest(".list .row.available .action .btn") ||
      e.target.closest(".friend-card.available .challenge-btn");

    if (!btn) return;

    e.stopPropagation();
    e.preventDefault();
    openModal(btn);
  });

  // "NO" closes modal
  noBtn?.addEventListener("click", closeModal);

  // "YES" shows waiting and then navigates after a delay
  yesBtn?.addEventListener("click", async () => {
    setState("waiting");
    // Simulate waiting for opponent; navigate to duel
    waitTimer = setTimeout(() => {
      window.location.assign('/pages/duel.html');
    }, 4000);
  });

  // Cancel waiting returns to page
  cancelWaitBtn?.addEventListener("click", () => {
    closeModal();
  });

  // Click outside dialog closes modal
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // ESC closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });
});
