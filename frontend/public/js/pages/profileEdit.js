/**
 * Profile Edit page - Update user profile and avatar
 * Connects to PUT /api/users/profile and POST /api/users/avatar
 */

// Use global instances from window
const apiClient = window.apiClient || window.api;
const authManager = window.authManager;

class ProfileEditPage {
  constructor() {
    this.currentUser = null;
    this.stats = null;
    this.selectedAvatarFile = null;
  }

  /**
   * Initialize the profile edit page
   */
  async init() {
    try {
      // Check authentication
      if (!authManager.isAuthenticated()) {
        window.location.href = '/pages/login.html';
        return;
      }

      // Load current user data
      await this.loadUserData();
      await this.loadUserStats();

      // Pre-fill form with current data
      this.populateForm();
      this.renderStats();
      this.attachEventListeners();

    } catch (error) {
      console.error('Profile edit page init error:', error);
      this.showError('Failed to load profile data');
    }
  }

  /**
   * Load current user data
   */
  async loadUserData() {
    try {
      const response = await apiClient.get('/auth/me');
      
      if (response.success) {
        this.currentUser = response.user;
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error) {
      console.error('Load user data error:', error);
      throw error;
    }
  }

  /**
   * Load user statistics
   */
  async loadUserStats() {
    try {
      const response = await apiClient.get(`/users/${this.currentUser.id}/stats`);
      
      if (response.success) {
        this.stats = response.stats;
      } else {
        this.stats = {
          wins: 0,
          losses: 0,
          winRate: 0
        };
      }
    } catch (error) {
      console.error('Load user stats error:', error);
      this.stats = {
        wins: 0,
        losses: 0,
        winRate: 0
      };
    }
  }

  /**
   * Populate form with current user data
   */
  populateForm() {
    // Account fields
    document.getElementById('username').value = this.currentUser.username || '';
    document.getElementById('email').value = this.currentUser.email || '';

    // Personal info fields (if exists)
    if (this.currentUser.profile) {
      const firstNameField = document.getElementById('firstName');
      const lastNameField = document.getElementById('lastName');
      const dobField = document.getElementById('dob');
      const countryField = document.getElementById('country');

      if (firstNameField) firstNameField.value = this.currentUser.profile.firstName || '';
      if (lastNameField) lastNameField.value = this.currentUser.profile.lastName || '';
      if (dobField && this.currentUser.profile.dateOfBirth) {
        dobField.value = this.formatDateForInput(this.currentUser.profile.dateOfBirth);
      }
      if (countryField) countryField.value = this.currentUser.profile.country || '';
    }

    // Update avatar preview
    const avatarImg = document.getElementById('avatarPreview');
    if (avatarImg) {
      avatarImg.src = this.currentUser.avatar || '/assets/images/default-avatar.png';
    }
  }

  /**
   * Render user statistics (read-only)
   */
  renderStats() {
    const statsDiv = document.querySelector('.stats');
    if (statsDiv) {
      const statElements = statsDiv.querySelectorAll('.stat');
      
      // Rank
      if (statElements[0]) {
        const rankValue = statElements[0].querySelector('.v');
        rankValue.textContent = this.calculateRank();
      }

      // Wins
      if (statElements[1]) {
        const winsValue = statElements[1].querySelector('.v');
        winsValue.textContent = this.stats.wins;
      }

      // Losses
      if (statElements[2]) {
        const lossesValue = statElements[2].querySelector('.v');
        lossesValue.textContent = this.stats.losses;
      }

      // Win rate
      if (statElements[3]) {
        const winRateProgress = statElements[3].querySelector('.progress i');
        const winRatePercent = Math.round(this.stats.winRate * 100);
        winRateProgress.style.width = `${winRatePercent}%`;
      }
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Form submission
    const form = document.getElementById('profileEditForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Avatar upload
    const avatarInput = document.getElementById('avatarUpload');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => this.handleAvatarSelect(e));
    }

    // Cancel button
    const cancelBtn = document.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        window.location.href = '/pages/profile.html';
      });
    }

    // Password fields toggle
    const currentPassword = document.getElementById('currentPassword');
    if (currentPassword) {
      currentPassword.addEventListener('input', (e) => {
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (e.target.value) {
          newPassword.required = true;
          confirmPassword.required = true;
        } else {
          newPassword.required = false;
          confirmPassword.required = false;
        }
      });
    }
  }

  /**
   * Handle avatar file selection
   */
  handleAvatarSelect(event) {
    const file = event.target.files[0];
    
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      this.showError('Please select a valid image file (JPEG, PNG, or GIF)');
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showError('Image file size must be less than 5MB');
      event.target.value = '';
      return;
    }

    this.selectedAvatarFile = file;

    // Preview the selected image
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('avatarPreview');
      if (preview) {
        preview.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('.btn-save');
    const originalBtnText = submitBtn.textContent;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'SAVING...';

      // Get form data
      const formData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        firstName: document.getElementById('firstName')?.value || '',
        lastName: document.getElementById('lastName')?.value || '',
        dateOfBirth: document.getElementById('dob')?.value || '',
        country: document.getElementById('country')?.value || ''
      };

      // Add password if changing
      const currentPassword = document.getElementById('currentPassword')?.value;
      const newPassword = document.getElementById('newPassword')?.value;
      const confirmPassword = document.getElementById('confirmPassword')?.value;

      if (currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match');
        }
        formData.currentPassword = currentPassword;
        formData.newPassword = newPassword;
      }

      // Update profile
      const response = await apiClient.put('/users/profile', formData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update profile');
      }

      // Upload avatar if selected
      if (this.selectedAvatarFile) {
        await this.uploadAvatar();
      }

      this.showSuccess('Profile updated successfully!');
      
      // Redirect to profile page after 1 second
      setTimeout(() => {
        window.location.href = '/pages/profile.html';
      }, 1000);

    } catch (error) {
      console.error('Form submit error:', error);
      this.showError(error.message || 'Failed to update profile');
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar() {
    try {
      const formData = new FormData();
      formData.append('avatar', this.selectedAvatarFile);

      const response = await apiClient.post('/users/avatar', formData, {
        headers: {
          // Let browser set Content-Type for multipart/form-data
        }
      });

      if (!response.success) {
        throw new Error('Failed to upload avatar');
      }

      return response;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  /**
   * Calculate user rank based on stats
   */
  calculateRank() {
    const wins = this.stats.wins;
    
    if (wins >= 100) return 'Diamond';
    if (wins >= 50) return 'Platinum';
    if (wins >= 25) return 'Gold';
    if (wins >= 10) return 'Silver';
    if (wins >= 1) return 'Bronze';
    return 'Unranked';
  }

  /**
   * Format date from Date object to input value (YYYY-MM-DD)
   */
  formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#44ff44;color:#000;padding:15px;border-radius:5px;z-index:1000;';
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#ff4444;color:white;padding:15px;border-radius:5px;z-index:1000;';
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const profileEditPage = new ProfileEditPage();
  profileEditPage.init();
});
