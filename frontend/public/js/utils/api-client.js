/**
 * API Client for TimeoutClick Frontend
 * Handles all HTTP requests to backend
 */

class ApiClient {
  constructor() {
    this.baseUrl = '/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      credentials: 'include', // Include session cookies
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
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

// Global API instance
window.api = new ApiClient();