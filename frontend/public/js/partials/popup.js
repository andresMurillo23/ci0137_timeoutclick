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

  document.addEventListener("click", (e) => {
    let btn =
      // CSS Selector for challenge.html
      e.target.closest(".list .row.available .action .btn") ||
      // CSS Selector for friends.html
      e.target.closest(".friend-card.available .challenge-btn");

    if (!btn) return;

    e.stopPropagation();
    e.preventDefault();

    openModal(btn);
  });

  // NO -> Close the modal
  noBtn?.addEventListener("click", closeModal);

  // YES -> shows waiting panel and starts wait timer
  yesBtn?.addEventListener("click", async () => {
    setState("waiting");

    waitTimer = setTimeout(() => {
      window.location.assign('/pages/duel.html');

    }, 4000);
  });

  // Cancel waiting
  cancelWaitBtn?.addEventListener("click", () => {
    closeModal();
  });

  // Close on outside click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // ESC key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });
});
