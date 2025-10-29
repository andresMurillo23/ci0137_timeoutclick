// Elementos del DOM
const surrenderBtn = document.getElementById('surrenderBtn');
const surrenderModal = document.getElementById('surrenderModal');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');

// Abrir modal
surrenderBtn.addEventListener('click', () => {
  surrenderModal.classList.add('active');
  surrenderModal.setAttribute('aria-hidden', 'false');
});

// Cerrar modal (cancelar)
cancelBtn.addEventListener('click', () => {
  surrenderModal.classList.remove('active');
  surrenderModal.setAttribute('aria-hidden', 'true');
});

// Confirmar rendición
confirmBtn.addEventListener('click', () => {

 // TODO: Lógica para manejar la rendición del jugador

  window.location.href = '/pages/home.html';
});

// Cerrar modal al hacer click fuera
surrenderModal.addEventListener('click', (e) => {
  if (e.target === surrenderModal) {
    surrenderModal.classList.remove('active');
    surrenderModal.setAttribute('aria-hidden', 'true');
  }
});

// Cerrar modal con tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && surrenderModal.classList.contains('active')) {
    surrenderModal.classList.remove('active');
    surrenderModal.setAttribute('aria-hidden', 'true');
  }
});
