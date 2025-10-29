console.log("[popup] archivo cargado");

document.addEventListener("DOMContentLoaded", () => {
        console.log("[popup] DOM listo");

    const overlay = document.getElementById("confirmOverlay");
    const dialog = overlay ? overlay.querySelector(".dialog") : null;
    const openBtn = document.getElementById("deleteBtn");
    const noBtn = document.getElementById("noBtn");
    const yesBtn = document.getElementById("yesBtn");
    const who = document.getElementById("who");
    const username = document.getElementById("username");

    
    console.table({
        overlay: !!overlay,
    dialog: !!dialog,
    openBtn: !!openBtn,
    noBtn: !!noBtn,
    yesBtn: !!yesBtn,
    who: !!who,
    username: !!username,
    });

    if (!overlay || !dialog) {
        console.error("[popup] Falta el overlay o el dialog en el DOM.");
    return;
    }

    function openModal() {
        if (username && who) who.textContent = (username.textContent || "").trim();
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
        setTimeout(() => dialog.focus(), 0);
    console.log("[popup] openModal()");
    }

    function closeModal() {
        overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    openBtn?.focus();
    console.log("[popup] closeModal()");
    }

    
    openBtn?.addEventListener("click", openModal);

   
    document.addEventListener("click", (e) => {
        if (e.target.closest && e.target.closest("#deleteBtn")) {
        openModal();
        }
    });

    // Cerrar clic fuera
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    // Botones NO/YES
    noBtn?.addEventListener("click", closeModal);
    yesBtn?.addEventListener("click", () => {
        // TODO: logica real
        closeModal();
    });

    
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });
});
