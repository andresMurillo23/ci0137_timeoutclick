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

  // Initialize auth state
  async initialize() {
    try {
      const user = await window.api.getCurrentUser();
      this.currentUser = user;
      this.isLoggedIn = true;
      this.notifyAuthChange();
      return user;
    } catch (error) {
      console.log('User not authenticated');
      this.currentUser = null;
      this.isLoggedIn = false;
      this.notifyAuthChange();
      return null;
    }
  }

  // Login
  async login(email, password) {
    try {
      const response = await window.api.login(email, password);
      this.currentUser = response.user;
      this.isLoggedIn = true;
      this.notifyAuthChange();
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Register
  async register(userData) {
    try {
      const response = await window.api.register(userData);
      this.currentUser = response.user;
      this.isLoggedIn = true;
      this.notifyAuthChange();
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await window.api.logout();
      this.currentUser = null;
      this.isLoggedIn = false;
      this.notifyAuthChange();
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if server request fails
      this.currentUser = null;
      this.isLoggedIn = false;
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

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  window.auth.initialize();
});