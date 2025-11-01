(function () {
  // Adjust the avatar preview panel height to match the left column
  function syncPreviewHeight() {
    var left  = document.querySelector('.left-col');
    var prev  = document.querySelector('.preview');
    if (!left || !prev) return;

    // Get computed height of the left column
    var h = left.offsetHeight;

    // Apply same height to the right preview panel
    prev.style.height = h + 'px';
  }

  // Run on full load and when the window resizes
  window.addEventListener('load',  syncPreviewHeight);
  window.addEventListener('resize', syncPreviewHeight);

  // Also react to internal size changes of the left column (more reliable)
  var leftEl = document.querySelector('.left-col');
  if (leftEl && 'ResizeObserver' in window) {
    var ro = new ResizeObserver(syncPreviewHeight);
    ro.observe(leftEl);
  }
})();
