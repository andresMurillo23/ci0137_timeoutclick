(function () {
  // Tab switching functionality
  const tabs = Array.from(document.querySelectorAll('.invitations-tabs .tab'));
  const indicator = document.querySelector('.invitations-tabs .tab-indicator');
  const bar = document.querySelector('.invitations-tabs');

  // Update the position and width of the indicator
  function updateIndicator(tab) {
    const rect = tab.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const left = rect.left - barRect.left;
    const width = rect.width;
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translateX(${left}px)`;
  }

  // Activate a tab and show its panel
  function activate(tab) {
    tabs.forEach(t => {
      const panel = document.getElementById(t.getAttribute('data-target'));
      const selected = t === tab;
      t.setAttribute('aria-selected', selected);
      if (panel) panel.hidden = !selected;
    });
    updateIndicator(tab);
  }

    // Event listeners
  tabs.forEach(t => t.addEventListener('click', () => activate(t)));

  // Initialize the indicator on page load
  const initial = document.querySelector('.invitations-tabs .tab[aria-selected="true"]');
  if (initial) updateIndicator(initial);

  // Recalculate indicator on window resize
  window.addEventListener('resize', () => {
    const active = document.querySelector('.invitations-tabs .tab[aria-selected="true"]');
    if (active) updateIndicator(active);
  });
})();
