/**
 * Profile Edit page - Update user profile and avatar
 * Connects to PUT /api/users/profile and POST /api/users/avatar
 */

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
      if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('[PROFILE-EDIT] Not authenticated, redirecting to login');
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
      const response = await window.apiClient.get('/auth/me');
      
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
      const response = await window.apiClient.get(`/users/${this.currentUser.id}/stats`);
      
      if (response.success && response.stats) {
        // Map backend stats to expected format
        this.stats = {
          wins: response.stats.gamesWon || 0,
          losses: (response.stats.gamesPlayed || 0) - (response.stats.gamesWon || 0),
          winRate: response.stats.winRate || 0,
          friendsCount: this.currentUser.friendsCount || 0
        };
      } else {
        this.stats = this.getDefaultStats();
      }
    } catch (error) {
      console.warn('[PROFILE-EDIT] Could not load stats, using defaults:', error.message);
      this.stats = this.getDefaultStats();
    }
  }

  /**
   * Get default stats when loading fails
   */
  getDefaultStats() {
    return {
      wins: 0,
      losses: 0,
      winRate: 0,
      friendsCount: 0
    };
  }

  /**
   * Populate form with current user data
   */
  populateForm() {
    // Account fields
    document.getElementById('username').value = this.currentUser.username || '';
    document.getElementById('email').value = this.currentUser.email || '';
    
    // User ID (readonly)
    const userIdField = document.getElementById('userId');
    if (userIdField && this.currentUser.id) {
      userIdField.value = this.formatUserId(this.currentUser.id);
    }
    
    // Member since (readonly)
    const memberSinceField = document.getElementById('memberSince');
    if (memberSinceField && this.currentUser.createdAt) {
      memberSinceField.value = this.formatDate(this.currentUser.createdAt);
    }
    
    // Email verification status (readonly)
    const verificationField = document.getElementById('verification');
    if (verificationField) {
      verificationField.value = this.currentUser.emailVerified ? 'Email verified' : 'Not verified';
    }

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
      avatarImg.src = this.getAvatarUrl(this.currentUser.avatar);
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
    
    // Fill GAME STATS panel
    const winsLossesEl = document.getElementById('winsLosses');
    if (winsLossesEl) {
      winsLossesEl.textContent = `${this.stats.wins} / ${this.stats.losses}`;
    }
    
    const friendsCountEl = document.getElementById('friendsCount');
    if (friendsCountEl) {
      friendsCountEl.textContent = this.stats.friendsCount || 0;
    }
    
    const rankEl = document.getElementById('rank');
    if (rankEl) {
      rankEl.textContent = this.calculateRank();
    }
    
    const winRateEl = document.getElementById('winRate');
    if (winRateEl) {
      const winRatePercent = Math.round(this.stats.winRate * 100);
      winRateEl.textContent = `${winRatePercent}%`;
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Form submission
    const form = document.getElementById('profileEditForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log('[PROFILE-EDIT] Form submitted');
        this.handleFormSubmit(e);
      });
    }

    // Avatar upload
    const avatarInput = document.getElementById('avatarFile');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => this.handleAvatarSelect(e));
    }

    // Update filename display when file is selected
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        const filenameSpan = document.getElementById('avatarFilename');
        if (filenameSpan && e.target.files[0]) {
          filenameSpan.textContent = e.target.files[0].name;
        }
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
    
    if (!file) {
      this.selectedAvatarFile = null;
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.showError('Please select a valid image file (JPEG, PNG, or GIF)');
      event.target.value = '';
      const filenameSpan = document.getElementById('avatarFilename');
      if (filenameSpan) filenameSpan.textContent = 'No file chosen';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showError('Image file size must be less than 5MB');
      event.target.value = '';
      const filenameSpan = document.getElementById('avatarFilename');
      if (filenameSpan) filenameSpan.textContent = 'No file chosen';
      return;
    }

    this.selectedAvatarFile = file;
    console.log('[PROFILE-EDIT] Avatar file selected:', file.name, file.type, file.size);

    // Preview the selected image
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('avatarPreview');
      if (preview) {
        preview.src = e.target.result;
        console.log('[PROFILE-EDIT] Avatar preview updated');
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('saveBtn');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'SAVE';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SAVING...';
      }

      // Get form data (only include fields that have values)
      const formData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value
      };
      
      // Add optional fields only if they have values
      const firstName = document.getElementById('firstName')?.value;
      const lastName = document.getElementById('lastName')?.value;
      const dateOfBirth = document.getElementById('dob')?.value;
      const country = document.getElementById('country')?.value;
      
      if (firstName) formData.firstName = firstName;
      if (lastName) formData.lastName = lastName;
      if (dateOfBirth) formData.dateOfBirth = dateOfBirth;
      if (country) formData.country = country;

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

      // Upload avatar first if selected
      let avatarUploaded = false;
      if (this.selectedAvatarFile) {
        console.log('[PROFILE-EDIT] Uploading avatar...');
        await this.uploadAvatar();
        console.log('[PROFILE-EDIT] Avatar uploaded successfully');
        avatarUploaded = true;
      }

      // Check if there are profile changes (not just avatar)
      const hasProfileChanges = formData.firstName || formData.lastName || 
                                formData.dateOfBirth || formData.country || 
                                formData.currentPassword;

      // Update profile only if there are changes beyond just the avatar
      if (hasProfileChanges) {
        console.log('[PROFILE-EDIT] Updating profile data...', formData);
        const response = await window.apiClient.put('/users/profile', formData);

        if (!response.success) {
          throw new Error(response.error || 'Failed to update profile');
        }
        console.log('[PROFILE-EDIT] Profile updated successfully');
      }

      // Show success message
      if (avatarUploaded && hasProfileChanges) {
        this.showSuccess('Avatar and profile updated successfully!');
      } else if (avatarUploaded) {
        this.showSuccess('Avatar updated successfully!');
      } else if (hasProfileChanges) {
        this.showSuccess('Profile updated successfully!');
      }
      
      // Redirect to profile page after 1.5 seconds
      setTimeout(() => {
        window.location.href = '/pages/profile.html';
      }, 1500);

    } catch (error) {
      console.error('[PROFILE-EDIT] Form submit error:', error);
      this.showError(error.message || 'Failed to update profile');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar() {
    try {
      console.log('[PROFILE-EDIT] Uploading avatar:', this.selectedAvatarFile.name);
      
      const formData = new FormData();
      formData.append('avatar', this.selectedAvatarFile);

      console.log('[PROFILE-EDIT] Sending POST request to /users/avatar');
      const response = await window.apiClient.post('/users/avatar', formData);

      console.log('[PROFILE-EDIT] Avatar upload response:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload avatar');
      }

      return response;
    } catch (error) {
      console.error('[PROFILE-EDIT] Avatar upload error:', error);
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  /**
   * Get full avatar URL from relative path
   */
  getAvatarUrl(avatarPath) {
    if (!avatarPath) return '/assets/images/profile.jpg';
    if (avatarPath.startsWith('http')) return avatarPath;
    return `http://localhost:3000/uploads/${avatarPath}`;
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
   * Format user ID for display
   */
  formatUserId(id) {
    if (!id) return 'N/A';
    const shortId = id.substring(0, 8).toUpperCase();
    return `#${shortId.substring(0, 4)}-${shortId.substring(4)}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
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
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for authManager to initialize if not already done
  if (window.authManager && !window.authManager.isLoggedIn) {
    await window.authManager.initialize();
  }
  
  const profileEditPage = new ProfileEditPage();
  profileEditPage.init();
});
