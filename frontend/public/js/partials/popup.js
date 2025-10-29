document.addEventListener("DOMContentLoaded", () => {
  const overlay  = document.getElementById("confirmOverlay");
  const dialog   = overlay?.querySelector(".dialog");
  const noBtn    = document.getElementById("noBtn");
  const yesBtn   = document.getElementById("yesBtn");
  const who      = document.getElementById("who");

  let lastTrigger = null;
  let opponent = "";

  if (!overlay || !dialog || !noBtn || !yesBtn || !who) return;

  function openModal(fromBtn) {
    lastTrigger = fromBtn || null;
    const row = fromBtn?.closest(".row");
    opponent = (row?.querySelector(".username")?.textContent || "").trim();
    who.textContent = opponent || "Player";
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => dialog.focus(), 0);
  }
  function closeModal() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastTrigger?.focus();
  }

  // Solo abre si la fila es .available y el botón NO está disabled
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".action .btn, .action .btn-unavailable");
    if (!btn) return;

    // ignora botones deshabilitados
    if (btn.disabled) return;

    const row = btn.closest(".row");
    if (!row) return;

    if (row.classList.contains("available")) {
      openModal(btn);
    } else {
      // showToast("This player is not available right now");
    }
  });

  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  noBtn.addEventListener("click", closeModal);
  yesBtn.addEventListener("click", () => {
    // TODO: lógica real ( llamar API)
    closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });
});
