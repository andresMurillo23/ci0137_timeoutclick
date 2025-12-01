// Login page functionality
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  window.auth.onAuthChange((isLoggedIn) => {
    if (isLoggedIn) {
      window.location.href = '/pages/homeLogged.html';
    }
  });

  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!identifier || !password) {
      showError('Please fill in all fields');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'LOGGING IN...';
    hideError();

    try {
      await window.auth.login(identifier, password);
      // Auth manager will redirect automatically
    } catch (error) {
      showError(error.message || 'Login failed. Please try again.');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'LOGIN';
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }
});