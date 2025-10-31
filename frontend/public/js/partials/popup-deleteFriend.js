(function () {
  function init() {
    const overlay = document.getElementById('confirmOverlay');
    const dialog = overlay?.querySelector('.dialog');
    const who = document.getElementById('who');

    const openBtn = document.getElementById('deleteBtn');
    const noBtn = document.getElementById('noBtn');
    const yesBtn = document.getElementById('yesBtn');

    if (!overlay || !dialog || !openBtn) return;

    let lastTrigger = null;

    function setAriaOpen(isOpen) {
      overlay.setAttribute('aria-hidden', String(!isOpen));
    }

    function openModal(triggerElem) {
      lastTrigger = triggerElem || null;
      const username = document.getElementById('username')?.textContent?.trim() || who?.textContent?.trim() || 'Player';
      if (who) who.textContent = username;
      overlay.classList.add('open');
      setAriaOpen(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => { try { dialog.focus(); } catch(e) {} }, 0);
    }

    function closeModal() {
      overlay.classList.remove('open');
      setAriaOpen(false);
      document.body.style.overflow = '';
      if (lastTrigger?.focus) lastTrigger.focus();
      lastTrigger = null;
    }

    openBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(openBtn); });
    noBtn?.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    yesBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const detail = { username: who?.textContent?.trim() || null, trigger: lastTrigger };
      document.dispatchEvent(new CustomEvent('friend.delete.confirm', { detail }));
      closeModal();
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();