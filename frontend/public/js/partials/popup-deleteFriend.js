(function () {
  // Initialize modal logic once DOM is ready
  function init() {
    // Core elements
    const overlay = document.getElementById('confirmOverlay');
    const dialog = overlay?.querySelector('.dialog');
    const who = document.getElementById('who');

    // Triggers and action buttons
    const openBtn = document.getElementById('deleteBtn');
    const noBtn = document.getElementById('noBtn');
    const yesBtn = document.getElementById('yesBtn');

    // Abort if required elements are missing
    if (!overlay || !dialog || !openBtn) return;

    // Keep last element that opened the modal to restore focus on close
    let lastTrigger = null;

    // Update aria-hidden according to modal state
    function setAriaOpen(isOpen) {
      overlay.setAttribute('aria-hidden', String(!isOpen));
    }

    // Open modal and focus dialog
    function openModal(triggerElem) {
      lastTrigger = triggerElem || null;
      const username =
        document.getElementById('username')?.textContent?.trim() ||
        who?.textContent?.trim() ||
        'Player';
      if (who) who.textContent = username;
      overlay.classList.add('open');
      setAriaOpen(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => { try { dialog.focus(); } catch(e) {} }, 0);
    }

    // Close modal and restore focus/scroll
    function closeModal() {
      overlay.classList.remove('open');
      setAriaOpen(false);
      document.body.style.overflow = '';
      if (lastTrigger?.focus) lastTrigger.focus();
      lastTrigger = null;
    }

    // Open via delete button
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(openBtn);
    });

    // Cancel closes modal
    noBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });

    // Confirm emits custom event and closes modal
    yesBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const detail = { username: who?.textContent?.trim() || null, trigger: lastTrigger };
      document.dispatchEvent(new CustomEvent('friend.delete.confirm', { detail }));
      closeModal();
    });

    // Click outside dialog closes modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // ESC closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });
  }

  // Run init now or on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
