/**
 * Global configuration for the application
 * This file should be loaded before any other scripts that need API access
 */

// Detect environment and set backend URL
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

window.CONFIG = {
  // Backend URL - change ngrok URL here when it changes
  BACKEND_URL: isLocalhost 
    ? 'http://localhost:3000'
    : 'https://9bf3ee048da0.ngrok-free.app',
  
  // API base URL (adds /api to backend)
  get API_URL() {
    return `${this.BACKEND_URL}/api`;
  },
  
  // Uploads URL for avatars and files
  get UPLOADS_URL() {
    return `${this.BACKEND_URL}/uploads`;
  }
};

// Also set window.api.baseUrl for backwards compatibility with api-client.js
window.api = window.api || {};
window.api.baseUrl = window.CONFIG.BACKEND_URL;

console.log('[CONFIG] Environment:', isLocalhost ? 'localhost' : 'production');
console.log('[CONFIG] Backend URL:', window.CONFIG.BACKEND_URL);
