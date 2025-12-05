/**
 * Profile page - Display user profile and stats
 * Connects to GET /api/auth/me and GET /api/users/:id/stats
 */

class ProfilePage {
  constructor() {
    this.currentUser = null;
    this.stats = null;
  }

  /**
   * Initialize the profile page
   */
  async init() {
    try {
      // Ensure auth manager is initialized and token is present
      if (window.auth) {
        try {
          await window.auth.initialize();
        } catch (e) {
          console.warn('[PROFILE] Auth initialize warning:', e && e.message);
        }
      }

      if (!sessionStorage.getItem('authToken')) {
        console.log('[PROFILE] No auth token, redirecting to login');
        window.location.href = '/pages/login.html';
        return;
      }

      await this.loadUserData();
      await this.loadUserStats();

      this.renderProfile();
      this.renderStats();
      this.attachEventListeners();
      
      console.log('[PROFILE] Profile loaded successfully');

    } catch (error) {
      console.error('[PROFILE] Init error:', error);
      this.showError('Failed to load profile data: ' + error.message);
    }
  }

  async loadUserData() {
    try {
      const response = await window.api.getCurrentUser();
      
      if (response.success) {
        this.currentUser = response.user;
      } else if (response.user) {
        this.currentUser = response.user;
      } else {
        this.currentUser = response;
      }
    } catch (error) {
      console.error('[PROFILE] Error loading user data:', error);
      throw error;
    }
  }

  async loadUserStats() {
    try {
      const userId = this.currentUser.id || this.currentUser._id;
      const response = await window.api.get(`/users/${userId}/stats`);
      
      if (response && response.success && response.stats) {
        const s = response.stats;
        const gamesPlayed = Number(s.gamesPlayed || 0);
        const gamesWon = Number(s.gamesWon || 0);
        const gamesLost = Number(s.gamesLost != null ? s.gamesLost : (gamesPlayed - gamesWon));
        const rawWinRate = Number(s.winRate != null ? s.winRate : 0);

        this.stats = {
          gamesPlayed,
          gamesWon,
          gamesLost,
          // legacy aliases for older code
          wins: gamesWon,
          losses: gamesLost,
          // keep raw value and a normalized decimal in [0,1]
          winRate: rawWinRate,
          winRateDecimal: rawWinRate > 1 ? rawWinRate / 100 : rawWinRate,
          totalScore: s.totalScore || 0,
          bestTime: s.bestTime || null,
          averageTime: s.averageTime || null
        };
      } else {
        this.stats = {
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          winRateDecimal: 0,
          totalScore: 0,
          bestTime: null,
          averageTime: null
        };
      }
    } catch (error) {
      console.error('Load user stats error:', error);
      this.stats = {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        averageAccuracy: 0,
        bestTime: null,
        currentStreak: 0
      };
    }
  }

  /**
   * Render user profile information
   */
  renderProfile() {
    console.log('Rendering profile with user:', this.currentUser);
    
    // Update account section (first panel)
    const allPanels = document.querySelectorAll('.panel');
    const accountPanel = allPanels[0]; // First panel is ACCOUNT
    
    if (accountPanel) {
      const kvGrid = accountPanel.querySelector('.kv-grid');
      if (kvGrid) {
        const kvElements = kvGrid.querySelectorAll('.kv');
        
        // First column: Username, Email, User ID
        if (kvElements[0]) {
          const values = kvElements[0].querySelectorAll('.value');
          if (values[0]) values[0].textContent = this.currentUser.username || 'N/A';
          if (values[1]) values[1].textContent = this.currentUser.email || 'N/A';
          if (values[2]) values[2].textContent = this.formatUserId(this.currentUser.id || this.currentUser._id);
        }

        // Second column: Member Since, Verification, Password
        if (kvElements[1]) {
          const values = kvElements[1].querySelectorAll('.value');
          if (values[0]) values[0].textContent = this.formatDate(this.currentUser.createdAt);
          if (values[1]) values[1].textContent = (this.currentUser.emailVerified || this.currentUser.isEmailVerified) ? 'Verified' : 'Not Verified';
          if (values[2]) values[2].textContent = '•••••••••••';
        }
      }
    }

    // Update avatar (right side panel)
    const avatarImg = document.querySelector('.preview img');
    if (avatarImg) {
      avatarImg.src = this.getAvatarUrl(this.currentUser.avatar);
      avatarImg.alt = `${this.currentUser.username}'s avatar`;
    }

    // Update game stats panel (second panel in left-col)
    const gameStatsPanel = allPanels[1]; // Second panel is GAME STATS
    if (gameStatsPanel && this.stats) {
      const kvGrid = gameStatsPanel.querySelector('.kv-grid');
      if (kvGrid) {
        const kvElements = kvGrid.querySelectorAll('.kv');
        
        // First column: Wins/Losses, Friends
        if (kvElements[0]) {
          const values = kvElements[0].querySelectorAll('.value');
          if (values[0]) values[0].textContent = `${this.stats.gamesWon || 0} / ${this.stats.gamesLost || 0}`;
          if (values[1]) values[1].textContent = this.currentUser.friendsCount || 0;
        }

        // Second column: Rank, Win Rate
        if (kvElements[1]) {
          const values = kvElements[1].querySelectorAll('.value');
          if (values[0]) values[0].textContent = this.calculateRank();
          if (values[1]) values[1].textContent = `${Math.round((this.stats.winRateDecimal || 0) * 100)}%`;
        }
      }
    }
  }

  /**
   * Render user statistics
   */
  renderStats() {
    console.log('Rendering stats:', this.stats);
    
    // Update quick stats at the top
    const statsDiv = document.querySelector('.stats');
    if (statsDiv) {
      const statElements = statsDiv.querySelectorAll('.stat');
      
      // Rank
      if (statElements[0]) {
        const rankValue = statElements[0].querySelector('.v');
        if (rankValue) rankValue.textContent = this.calculateRank();
      }

      // Wins
      if (statElements[1]) {
        const winsValue = statElements[1].querySelector('.v');
        if (winsValue) winsValue.textContent = this.stats.gamesWon || 0;
      }

      // Losses
      if (statElements[2]) {
        const lossesValue = statElements[2].querySelector('.v');
        if (lossesValue) lossesValue.textContent = this.stats.gamesLost || 0;
      }

      // Win rate progress bar
      if (statElements[3]) {
        const winRateProgress = statElements[3].querySelector('.progress i');
        if (winRateProgress) {
          const winRatePercent = Math.round((this.stats.winRateDecimal || 0) * 100);
          winRateProgress.style.width = `${Math.min(100, Math.max(0, winRatePercent))}%`;
        }
      }
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Edit profile button
    const editBtn = document.querySelector('.btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        window.location.href = '/pages/profileEdit.html';
      });
    }

    // Logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.handleLogout();
      });
    }

    // Delete account button
    const deleteBtn = document.querySelector('.btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleDeleteAccount();
      });
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await window.apiClient.post('/auth/logout');
      window.authManager.logout();
      window.location.href = '/pages/home.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if request fails
      window.authManager.logout();
      window.location.href = '/pages/home.html';
    }
  }

  /**
   * Handle delete account
   */
  handleDeleteAccount() {
    // Redirect to delete profile page
    window.location.href = '/pages/deleteProfile.html';
  }

  /**
   * Get full avatar URL from relative path
   */
  getAvatarUrl(avatarPath) {
    if (!avatarPath) return '/assets/images/profile.jpg';
    if (avatarPath.startsWith('http')) return avatarPath;
    // Avatar paths from backend are like 'avatars/avatar_xxx.png'
    const baseUrl = window.CONFIG?.UPLOADS_URL || 'http://localhost:3000/uploads';
    const url = `${baseUrl}/${avatarPath}`;
    return baseUrl.includes('ngrok') ? `${url}?ngrok-skip-browser-warning=true` : url;
  }

  /**
   * Calculate user rank based on stats
   */
  calculateRank() {
    const wins = this.stats.gamesWon || 0;
    
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
// Note: profile page is initialized inline in the page markup to control load order.
