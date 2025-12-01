/**
 * Other Profile page - View another user's profile
 * Connects to GET /api/users/:id
 */

// Use global instances from window
const apiClient = window.apiClient || window.api;
const authManager = window.authManager;

class OtherProfilePage {
  constructor() {
    this.viewedUser = null;
    this.viewedUserId = null;
    this.currentUser = null;
  }

  /**
   * Initialize the other profile page
   */
  async init() {
    try {
      // Check authentication
      if (!authManager.isAuthenticated()) {
        window.location.href = '/pages/login.html';
        return;
      }

      // Get user ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      this.viewedUserId = urlParams.get('id');

      if (!this.viewedUserId) {
        this.showError('No user ID provided');
        setTimeout(() => {
          window.location.href = '/pages/homeLogged.html';
        }, 2000);
        return;
      }

      // Load current user (for friend status checks later)
      await this.loadCurrentUser();

      // Load viewed user data
      await this.loadUserProfile();

      // Render the UI
      this.renderProfile();
      this.attachEventListeners();

    } catch (error) {
      console.error('Other profile page init error:', error);
      this.showError('Failed to load user profile');
    }
  }

  /**
   * Load current user data
   */
  async loadCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      
      if (response.success) {
        this.currentUser = response.user;
      }
    } catch (error) {
      console.error('Load current user error:', error);
    }
  }

  /**
   * Load viewed user profile
   */
  async loadUserProfile() {
    try {
      const response = await apiClient.get(`/users/${this.viewedUserId}`);
      
      if (response.success) {
        this.viewedUser = response.user;
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Load user profile error:', error);
      throw error;
    }
  }

  /**
   * Render user profile information
   */
  renderProfile() {
    // Update page title
    const titleElement = document.querySelector('.titles');
    if (titleElement) {
      titleElement.textContent = `${this.viewedUser.username.toUpperCase()}'S PROFILE`;
    }

    // Update quick stats at the top
    this.renderStats();

    // Update account section
    const accountSection = document.querySelector('.panel .body .kv-grid');
    if (accountSection) {
      const kvElements = accountSection.querySelectorAll('.kv');
      
      if (kvElements[0]) {
        const values = kvElements[0].querySelectorAll('.value');
        values[0].textContent = this.viewedUser.username || 'N/A';
        values[1].textContent = this.formatUserId(this.viewedUser.id);
        values[2].textContent = this.formatDate(this.viewedUser.createdAt);
      }

      if (kvElements[1] && this.viewedUser.profile) {
        const values = kvElements[1].querySelectorAll('.value');
        values[0].textContent = this.viewedUser.profile.country || 'Not set';
        values[1].textContent = this.viewedUser.lastActive 
          ? this.formatRelativeTime(this.viewedUser.lastActive) 
          : 'Unknown';
      }
    }

    // Update avatar
    const avatarImg = document.querySelector('.avatar img');
    if (avatarImg) {
      avatarImg.src = this.viewedUser.avatar || '/assets/images/default-avatar.png';
      avatarImg.alt = `${this.viewedUser.username}'s avatar`;
    }

    // Update game stats panel
    if (this.viewedUser.gameStats) {
      const gameStatsSection = document.querySelectorAll('.panel')[1];
      if (gameStatsSection) {
        const values = gameStatsSection.querySelectorAll('.value');
        if (values.length >= 4) {
          values[0].textContent = this.viewedUser.gameStats.totalGames || 0;
          values[1].textContent = this.viewedUser.gameStats.wins || 0;
          values[2].textContent = this.viewedUser.gameStats.losses || 0;
          values[3].textContent = `${Math.round((this.viewedUser.winRate || 0) * 100)}%`;
        }
      }
    }

    // Show/hide action buttons based on friendship status
    this.updateActionButtons();
  }

  /**
   * Render user statistics
   */
  renderStats() {
    const statsDiv = document.querySelector('.stats');
    if (statsDiv && this.viewedUser.gameStats) {
      const statElements = statsDiv.querySelectorAll('.stat');
      
      // Rank
      if (statElements[0]) {
        const rankValue = statElements[0].querySelector('.v');
        rankValue.textContent = this.calculateRank();
      }

      // Wins
      if (statElements[1]) {
        const winsValue = statElements[1].querySelector('.v');
        winsValue.textContent = this.viewedUser.gameStats.wins || 0;
      }

      // Losses
      if (statElements[2]) {
        const lossesValue = statElements[2].querySelector('.v');
        lossesValue.textContent = this.viewedUser.gameStats.losses || 0;
      }

      // Win rate
      if (statElements[3]) {
        const winRateProgress = statElements[3].querySelector('.progress i');
        const winRatePercent = Math.round((this.viewedUser.winRate || 0) * 100);
        winRateProgress.style.width = `${winRatePercent}%`;
      }
    }
  }

  /**
   * Update action buttons based on friendship status
   */
  async updateActionButtons() {
    const addFriendBtn = document.querySelector('.btn-add-friend');
    const challengeBtn = document.querySelector('.btn-challenge');
    const messageBtn = document.querySelector('.btn-message');

    // Check if viewing own profile
    if (this.currentUser && this.viewedUser.id === this.currentUser.id) {
      if (addFriendBtn) addFriendBtn.style.display = 'none';
      if (challengeBtn) challengeBtn.style.display = 'none';
      if (messageBtn) messageBtn.style.display = 'none';
      return;
    }

    // Check friendship status
    try {
      const response = await apiClient.get(`/friends/status/${this.viewedUserId}`);
      
      if (response.success) {
        const status = response.status;

        if (status === 'friends') {
          // Already friends - show challenge button
          if (addFriendBtn) addFriendBtn.style.display = 'none';
          if (challengeBtn) challengeBtn.style.display = 'inline-block';
        } else if (status === 'pending') {
          // Invitation pending
          if (addFriendBtn) {
            addFriendBtn.textContent = 'PENDING';
            addFriendBtn.disabled = true;
          }
          if (challengeBtn) challengeBtn.style.display = 'none';
        } else {
          // Not friends - show add friend button
          if (addFriendBtn) {
            addFriendBtn.style.display = 'inline-block';
            addFriendBtn.disabled = false;
          }
          if (challengeBtn) challengeBtn.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Check friendship status error:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Add friend button
    const addFriendBtn = document.querySelector('.btn-add-friend');
    if (addFriendBtn) {
      addFriendBtn.addEventListener('click', () => this.handleAddFriend());
    }

    // Challenge button
    const challengeBtn = document.querySelector('.btn-challenge');
    if (challengeBtn) {
      challengeBtn.addEventListener('click', () => this.handleChallenge());
    }

    // Back button
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }
  }

  /**
   * Handle add friend action
   */
  async handleAddFriend() {
    try {
      const response = await apiClient.post('/friends/invite', {
        targetUserId: this.viewedUserId
      });

      if (response.success) {
        this.showSuccess('Friend request sent!');
        this.updateActionButtons();
      } else {
        throw new Error(response.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Add friend error:', error);
      this.showError(error.message || 'Failed to send friend request');
    }
  }

  /**
   * Handle challenge action
   */
  handleChallenge() {
    // Redirect to challenge page with user ID
    window.location.href = `/pages/challenge.html?friendId=${this.viewedUserId}`;
  }

  /**
   * Calculate user rank based on stats
   */
  calculateRank() {
    const wins = this.viewedUser.gameStats?.wins || 0;
    
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
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return this.formatDate(dateString);
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
  const otherProfilePage = new OtherProfilePage();
  otherProfilePage.init();
});
