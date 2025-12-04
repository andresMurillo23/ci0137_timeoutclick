/**
 * Password Recovery Page
 * Allows users to reset their password by providing email and new password
 */

document.addEventListener('DOMContentLoaded', function() {
  const emailInput = document.getElementById('email');
  const newPasswordInput = document.getElementById('newpass');
  const confirmPasswordInput = document.getElementById('confpass');
  const updateBtn = document.querySelector('.btn--secondary');
  const backBtn = document.querySelector('.btn--back');
  const messageDiv = document.getElementById('message');

  // Hardcode back button to go to login page
  backBtn.onclick = function() {
    window.location.href = '/pages/login.html';
  };

  /**
   * Show success message
   */
  function showSuccess(message) {
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.color = '#4CAF50';
    messageDiv.style.padding = '10px';
    messageDiv.style.marginTop = '10px';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.fontWeight = 'normal';
  }

  /**
   * Show error message
   */
  function showError(message) {
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.color = '#ff4444';
    messageDiv.style.padding = '10px';
    messageDiv.style.marginTop = '10px';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.fontWeight = 'normal';
  }

  /**
   * Hide all messages
   */
  function hideMessages() {
    messageDiv.style.display = 'none';
  }

  /**
   * Validate form inputs
   */
  function validateForm() {
    hideMessages();
    
    const email = emailInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!email) {
      showError('Please enter your email address');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(' Please enter a valid email address');
      return false;
    }

    if (!newPassword) {
      showError('Please enter a new password');
      return false;
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return false;
    }

    if (!confirmPassword) {
      showError('Please confirm your password');
      return false;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return false;
    }

    return true;
  }

  /**
   * Handle password reset
   */
  async function handlePasswordReset() {
    if (!validateForm()) {
      return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const newPassword = newPasswordInput.value;

    try {
      updateBtn.disabled = true;
      updateBtn.textContent = 'UPDATING...';

      // Step 1: Request password reset token
      const forgotResponse = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const forgotData = await forgotResponse.json();

      if (!forgotResponse.ok) {
        throw new Error(forgotData.error || 'Failed to process password reset');
      }

      // Step 2: Reset password with the token
      const resetResponse = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: forgotData.resetToken,
          newPassword: newPassword,
          confirmPassword: newPassword
        })
      });

      const resetData = await resetResponse.json();

      if (!resetResponse.ok) {
        throw new Error(resetData.error || 'Failed to reset password');
      }

      // Success! Show success message on the page
      showSuccess('Password updated successfully! Redirecting to login...');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 3000);

    } catch (error) {
      console.error('Password reset error:', error);
      showError(error.message || 'Failed to reset password. Please try again.');
      updateBtn.disabled = false;
      updateBtn.textContent = 'UPDATE';
    }
  }

  // Add click handler to update button
  updateBtn.addEventListener('click', handlePasswordReset);

  // Add enter key handlers
  [emailInput, newPasswordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePasswordReset();
      }
    });
  });
});
