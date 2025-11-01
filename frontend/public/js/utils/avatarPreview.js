(function () {
  // Get input, preview image, and filename label
  const input  = document.getElementById('avatarFile');
  const img    = document.getElementById('avatarPreview');
  const nameEl = document.getElementById('avatarFilename');

  // Abort if required elements are missing
  if (!input || !img) return;

  // When a file is selected, update filename and preview
  input.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    // Show selected file name (if label exists)
    if (nameEl) nameEl.textContent = f.name;

    // Create a temporary URL for preview and assign to <img>
    const url = URL.createObjectURL(f);
    img.src = url;

    // Revoke object URL after image loads to free memory
    img.onload = () => URL.revokeObjectURL(url);
  });
})();
