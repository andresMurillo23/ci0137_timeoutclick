// Login page functionality
document.addEventListener('DOMContentLoaded', () => {
  // Check for redirect parameters (e.g., from guest challenge email)
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  const gameId = urlParams.get('gameId');

  // Redirect if already logged in
  window.auth.onAuthChange((isLoggedIn) => {
    if (isLoggedIn) {
      // If coming from guest challenge email, redirect to challenge page
      if (redirect === 'challenge' && gameId) {
        window.location.href = `/pages/challenge.html?gameId=${gameId}&type=guest`;
      } else if (redirect === 'duel' && gameId) {
        window.location.href = `/pages/duel.html?gameId=${gameId}`;
      } else {
        window.location.href = '/pages/homeLogged.html';
      }
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
      
      // After successful login, redirect based on parameters
      if (redirect === 'challenge' && gameId) {
        window.location.href = `/pages/challenge.html?gameId=${gameId}&type=guest`;
      } else if (redirect === 'duel' && gameId) {
        window.location.href = `/pages/duel.html?gameId=${gameId}`;
      } else {
        window.location.href = '/pages/homeLogged.html';
      }
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