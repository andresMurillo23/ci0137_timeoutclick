(function () {
  function syncPreviewHeight() {
    var left  = document.querySelector('.left-col');
    var prev  = document.querySelector('.preview');
    if (!left || !prev) return;

    // Exact height of the left column (ACCOUNT + GAME STATS + separators)
    var h = left.offsetHeight;

    // Set right frame height so the photo ends at the same point
    prev.style.height = h + 'px';
  }

  // Executed on full load and on resize
  window.addEventListener('load',  syncPreviewHeight);
  window.addEventListener('resize', syncPreviewHeight);

  // Observe size changes due to dynamic content (optional but robust)
  var leftEl = document.querySelector('.left-col');
  if (leftEl && 'ResizeObserver' in window) {
    var ro = new ResizeObserver(syncPreviewHeight);
    ro.observe(leftEl);
  }
})();
