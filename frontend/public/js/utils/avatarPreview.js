// frontend/public/js/utils/avatarPreview.js
(function () {
  const input  = document.getElementById('avatarFile');
  const img    = document.getElementById('avatarPreview');
  const nameEl = document.getElementById('avatarFilename');

  if (!input || !img) return;

  input.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    if (nameEl) nameEl.textContent = f.name;

    const url = URL.createObjectURL(f);
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
  });
})();
