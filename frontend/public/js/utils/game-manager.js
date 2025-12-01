/**
 * Socket.IO Game Manager for TimeoutClick
 * Handles real-time game communication
 */

class GameManager {
  constructor() {
    this.socket = null;
    this.currentGame = null;
    this.isConnected = false;
    this.gameCallbacks = {
      gameStart: [],
      goalTimeSet: [],
      playerClick: [],
      gameEnd: [],
      opponentDisconnected: [],
      error: []
    };
  }

  // Initialize Socket.IO connection
  async connect() {
    if (!window.auth.isLoggedIn) {
      throw new Error('Must be logged in to connect to game server');
    }

    try {
      // Import Socket.IO client
      if (!window.io) {
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Get auth token from sessionStorage
      const token = sessionStorage.getItem('authToken');
      
      this.socket = window.io({
        autoConnect: true,
        withCredentials: true,
        auth: {
          token: token
        }
      });

      this.setupSocketHandlers();
      
      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('Connected to game server');
          this.isConnected = true;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Failed to connect to game server:', error);
          this.isConnected = false;
          reject(error);
        });

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Socket.IO connection error:', error);
      throw error;
    }
  }

  // Setup Socket.IO event handlers
  setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.on('game_matched', (data) => {
      console.log('Game matched:', data);
      this.currentGame = data.game;
      this.notifyCallbacks('gameMatched', data);
    });

    this.socket.on('game_start', (data) => {
      console.log('Game started:', data);
      this.notifyCallbacks('gameStart', data);
    });

    this.socket.on('goal_time_set', (data) => {
      console.log('Goal time set:', data);
      this.notifyCallbacks('goalTimeSet', data);
    });

    this.socket.on('player_clicked', (data) => {
      console.log('Player clicked:', data);
      this.notifyCallbacks('playerClick', data);
    });

    this.socket.on('game_finished', (data) => {
      console.log('Game finished:', data);
      this.currentGame = null;
      this.notifyCallbacks('gameEnd', data);
    });

    this.socket.on('opponent_disconnected', (data) => {
      console.log('Opponent disconnected:', data);
      this.notifyCallbacks('opponentDisconnected', data);
    });

    this.socket.on('game_error', (data) => {
      console.error('Game error:', data);
      this.notifyCallbacks('error', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from game server');
      this.isConnected = false;
    });
  }

  // Subscribe to game events
  on(event, callback) {
    if (this.gameCallbacks[event]) {
      this.gameCallbacks[event].push(callback);
    }
  }

  // Notify event callbacks
  notifyCallbacks(event, data) {
    if (this.gameCallbacks[event]) {
      this.gameCallbacks[event].forEach(callback => callback(data));
    }
  }

  // Join a game
  async joinGame(gameId) {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('join_game', { gameId }, (response) => {
        if (response.success) {
          this.currentGame = response.game;
          resolve(response.game);
        } else {
          reject(new Error(response.error || 'Failed to join game'));
        }
      });
    });
  }

  // Send player click
  playerClick(clickTime) {
    if (!this.socket || !this.currentGame) {
      throw new Error('Not connected to a game');
    }

    this.socket.emit('player_click', {
      gameId: this.currentGame.id,
      clickTime: clickTime,
      timestamp: Date.now()
    });
  }

  // Forfeit/surrender game
  forfeitGame() {
    if (!this.socket || !this.currentGame) {
      throw new Error('Not connected to a game');
    }

    this.socket.emit('forfeit_game', {
      gameId: this.currentGame.id
    });
  }

  // Disconnect from game server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentGame = null;
    }
  }

  // Check if currently in a game
  isInGame() {
    return this.currentGame !== null;
  }

  // Get current game info
  getCurrentGame() {
    return this.currentGame;
  }
}

// Global game manager instance
window.gameManager = new GameManager();