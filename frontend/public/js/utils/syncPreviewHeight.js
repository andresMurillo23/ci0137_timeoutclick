(function () {
  function syncPreviewHeight() {
    var left  = document.querySelector('.left-col');
    var prev  = document.querySelector('.preview');
    if (!left || !prev) return;

    // Altura exacta de la columna izquierda (ACCOUNT + GAME STATS + separadores)
    var h = left.offsetHeight;

    // Fijar altura del marco derecho para que la foto termine en el mismo punto
    prev.style.height = h + 'px';
  }

  // Ejecutar al cargar todo y al redimensionar
  window.addEventListener('load',  syncPreviewHeight);
  window.addEventListener('resize', syncPreviewHeight);

  // Observa cambios de tamaño por contenido dinámico (opcional pero robusto)
  var leftEl = document.querySelector('.left-col');
  if (leftEl && 'ResizeObserver' in window) {
    var ro = new ResizeObserver(syncPreviewHeight);
    ro.observe(leftEl);
  }
})();
