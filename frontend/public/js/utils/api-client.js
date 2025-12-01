/**
 * API Client for TimeoutClick Frontend
 * Handles all HTTP requests to backend
 */

class ApiClient {
  constructor() {
    // TEMPORAL: Conectar DIRECTAMENTE al backend sin proxy para debugging
    this.baseUrl = 'http://localhost:3000/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Make HTTP request to backend API
   * Automatically includes authentication token if available
   * @param {string} endpoint - API endpoint path
   * @param {object} options - Fetch options
   * @returns {Promise<object|string>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = sessionStorage.getItem('authToken');
    
    const config = {
      credentials: 'include',
      headers: { 
        ...this.defaultHeaders,
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers 
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        console.error('API Error Response:', error);
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Generic GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<object>} Response data
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * Generic POST request
   * @param {string} endpoint - API endpoint
   * @param {object|FormData} data - Request body
   * @param {object} options - Additional options
   * @returns {Promise<object>} Response data
   */
  async post(endpoint, data, options = {}) {
    const isFormData = data instanceof FormData;
    
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : undefined,
      ...options
    });
  }

  /**
   * Generic PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body
   * @returns {Promise<object>} Response data
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Generic DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<object>} Response data
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  }

  async register(userData) {
    // Add confirmPassword for backend validation
    const dataWithConfirm = {
      ...userData,
      confirmPassword: userData.password
    };
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dataWithConfirm)
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // User methods
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(userData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async searchUsers(query) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Friends methods
  async getFriends() {
    return this.request('/friends');
  }

  async sendFriendRequest(targetUserId) {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId })
    });
  }

  async getInvitations() {
    return this.request('/friends/invitations');
  }

  async respondToInvitation(invitationId, action) {
    return this.request(`/friends/invitations/${invitationId}`, {
      method: 'PUT',
      body: JSON.stringify({ action })
    });
  }

  async removeFriend(friendId) {
    return this.request(`/friends/${friendId}`, {
      method: 'DELETE'
    });
  }

  // Game methods
  async createChallenge(opponentId) {
    return this.request('/games/challenge', {
      method: 'POST',
      body: JSON.stringify({ opponentId })
    });
  }

  async getActiveGame() {
    return this.request('/games/active');
  }

  async getGameHistory(page = 1, limit = 10) {
    return this.request(`/games/history?page=${page}&limit=${limit}`);
  }

  async getGameStats() {
    return this.request('/games/stats');
  }

  async getLeaderboard() {
    return this.request('/games/leaderboard');
  }

  async cancelGame(gameId) {
    return this.request(`/games/${gameId}/cancel`, {
      method: 'PUT'
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export for both ES6 modules and regular scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { apiClient, ApiClient };
}

// Global instances for backward compatibility and ES6 imports
window.api = apiClient;
window.apiClient = apiClient;
window.ApiClient = ApiClient;