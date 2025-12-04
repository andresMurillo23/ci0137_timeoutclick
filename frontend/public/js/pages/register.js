// Register page functionality
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  window.auth.onAuthChange((isLoggedIn) => {
    if (isLoggedIn) {
      window.location.href = '/pages/homeLogged.html';
    }
  });

  const registerForm = document.getElementById('registerForm');
  const registerBtn = document.getElementById('registerBtn');
  const errorMessage = document.getElementById('errorMessage');

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm').value;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'CREATING ACCOUNT...';
    hideError();

    try {
      const userData = {
        username,
        email,
        password,
        confirmPassword
      };
      
      await window.auth.register(userData);
      // Auth manager will redirect automatically
    } catch (error) {
      showError(error.message || 'Registration failed. Please try again.');
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = 'REGISTER';
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