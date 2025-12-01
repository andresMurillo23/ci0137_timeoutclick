/**
 * Authentication manager for TimeoutClick
 * Handles login/logout states and user session
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isLoggedIn = false;
    this.onAuthChangeCallbacks = [];
  }

  // Subscribe to auth state changes
  onAuthChange(callback) {
    this.onAuthChangeCallbacks.push(callback);
    // Call immediately with current state
    callback(this.isLoggedIn, this.currentUser);
  }

  // Notify all subscribers of auth state change
  notifyAuthChange() {
    this.onAuthChangeCallbacks.forEach(callback => {
      callback(this.isLoggedIn, this.currentUser);
    });
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.isLoggedIn && !!this.currentUser && !!sessionStorage.getItem('authToken');
  }

  /**
   * Initialize authentication state
   * Checks sessionStorage for existing token and user data
   * Validates token with backend in background
   */
  async initialize() {
    const token = sessionStorage.getItem('authToken');
    const storedUser = sessionStorage.getItem('currentUser');
    const storedIsLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (token && storedUser && storedIsLoggedIn === 'true') {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.isLoggedIn = true;
        this.notifyAuthChange();
        
        // Verify token validity in background
        window.api.getCurrentUser()
          .then(response => {
            this.currentUser = response.user || response;
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          })
          .catch(() => {
            this.logout();
          });
        
        return this.currentUser;
      } catch (e) {
        sessionStorage.clear();
      }
    }
    
    this.currentUser = null;
    this.isLoggedIn = false;
    sessionStorage.clear();
    this.notifyAuthChange();
    return null;
  }

  /**
   * Authenticate user with credentials
   * @param {string} identifier - Username or email
   * @param {string} password - User password
   * @returns {Promise<object>} Login response with user data and token
   */
  async login(identifier, password) {
    try {
      const response = await window.api.login(identifier, password);
      
      if (response.success && response.user && response.token) {
        this.currentUser = response.user;
        this.isLoggedIn = true;
        
        sessionStorage.setItem('authToken', response.token);
        sessionStorage.setItem('currentUser', JSON.stringify(response.user));
        sessionStorage.setItem('isLoggedIn', 'true');
        
        this.notifyAuthChange();
        return response;
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   * @param {object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Password
   * @returns {Promise<object>} Registration response with user data and token
   */
  async register(userData) {
    try {
      const response = await window.api.register(userData);
      
      if (response.success && response.user && response.token) {
        this.currentUser = response.user;
        this.isLoggedIn = true;
        
        sessionStorage.setItem('authToken', response.token);
        sessionStorage.setItem('currentUser', JSON.stringify(response.user));
        sessionStorage.setItem('isLoggedIn', 'true');
        
        this.notifyAuthChange();
        return response;
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   * Clears session storage and notifies listeners
   */
  async logout() {
    try {
      await window.api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      this.currentUser = null;
      this.isLoggedIn = false;
      sessionStorage.clear();
      this.notifyAuthChange();
    }
  }

  // Check if user is authenticated
  requireAuth() {
    if (!this.isLoggedIn) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  }

  // Redirect to home if already logged in
  redirectIfLoggedIn() {
    if (this.isLoggedIn) {
      window.location.href = '/pages/homeLogged.html';
      return true;
    }
    return false;
  }

  // Get current user info
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.currentUser) return 'Guest';
    return this.currentUser.displayName || this.currentUser.username || this.currentUser.email;
  }

  // Get user avatar URL
  getUserAvatar() {
    if (!this.currentUser) return '/assets/images/profile.jpg';
    return this.currentUser.avatar || '/assets/images/profile.jpg';
  }
}

// Global auth manager instance
window.auth = new AuthManager();
window.authManager = window.auth; // Alias for compatibility

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  window.auth.initialize();
});