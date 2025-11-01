// DOM elements
const surrenderBtn = document.getElementById('surrenderBtn');
const surrenderModal = document.getElementById('surrenderModal');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');

// Open modal
surrenderBtn.addEventListener('click', () => {
  surrenderModal.classList.add('active');
  surrenderModal.setAttribute('aria-hidden', 'false');
});

// Close modal
cancelBtn.addEventListener('click', () => {
  surrenderModal.classList.remove('active');
  surrenderModal.setAttribute('aria-hidden', 'true');
});

// Confirm surrender
confirmBtn.addEventListener('click', () => {
  window.location.href = '/pages/home.html';
});

// Close modal when clicking outside the dialog
surrenderModal.addEventListener('click', (e) => {
  if (e.target === surrenderModal) {
    surrenderModal.classList.remove('active');
    surrenderModal.setAttribute('aria-hidden', 'true');
  }
});

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && surrenderModal.classList.contains('active')) {
    surrenderModal.classList.remove('active');
    surrenderModal.setAttribute('aria-hidden', 'true');
  }
});
