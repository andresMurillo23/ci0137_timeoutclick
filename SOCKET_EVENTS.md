# Socket.IO Events Documentation - TimeoutClick

## Overview
This document describes all Socket.IO real-time events used in the TimeoutClick game. Events are now **fully aligned** between backend (`backend/socket/gameSocket.js`) and frontend (`frontend/public/js/utils/game-manager.js`).

---

## Connection Events

### Client → Server

#### `connect`
Emitted automatically when Socket.IO connection is established.

**Frontend:**
```javascript
this.socket.on('connect', () => {
  console.log('Connected to game server');
});
```

#### `disconnect`
Emitted when connection is lost.

**Frontend:**
```javascript
this.socket.on('disconnect', () => {
  console.log('Disconnected from game server');
});
```

---

## Game Lifecycle Events

### Client → Server

#### `join_game`
Player joins a game session.

**Payload:**
```javascript
{
  gameId: string  // MongoDB ObjectId of the game
}
```

**Backend Response:**
```javascript
socket.emit('game_joined', {
  gameId: string,
  playerRole: 'player1' | 'player2',
  game: {
    id: string,
    player1: { id, username, avatar },
    player2: { id, username, avatar },
    status: string,
    goalTime: number
  },
  session: {
    player1Connected: boolean,
    player2Connected: boolean,
    gameState: string
  }
});
```

---

### Server → Client

#### `game_matched`
Broadcast when matchmaking finds opponents.

**Payload:**
```javascript
{
  game: {
    id: string,
    player1: { id, username, avatar },
    player2: { id, username, avatar },
    goalTime: number
  }
}
```

**Frontend Handler:**
```javascript
this.socket.on('game_matched', (data) => {
  this.currentGame = data.game;
  this.notifyCallbacks('gameMatched', data);
});
```

---

#### `game_start`
Emitted when both players are ready and game begins.

**Payload:**
```javascript
{
  gameStartTime: Date,
  goalTime: number,
  message: string
}
```

**Frontend Handler:**
```javascript
this.socket.on('game_start', (data) => {
  this.notifyCallbacks('gameStart', data);
});
```

---

#### `goal_time_set`
Emitted with the target time players must match (for frontend compatibility).

**Payload:**
```javascript
{
  goalTime: number  // Time in milliseconds
}
```

**Frontend Handler:**
```javascript
this.socket.on('goal_time_set', (data) => {
  this.notifyCallbacks('goalTimeSet', data);
});
```

---

## Gameplay Events

### Client → Server

#### `player_click`
Player clicks the STOP button.

**Payload:**
```javascript
{
  gameId: string,
  clickTime: number,    // Client-side measured time
  timestamp: number     // Unix timestamp
}
```

**Backend Response:**
```javascript
socket.emit('click_registered', {
  playerId: string,
  clickTime: number,
  goalTime: number,
  difference: number
});
```

---

### Server → Client

#### `player_clicked`
Broadcast to all players when someone clicks.

**Payload:**
```javascript
{
  playerId: string,
  clickTime: number,      // Actual click time
  goalTime: number,       // Target time
  difference: number      // Math.abs(clickTime - goalTime)
}
```

**Frontend Handler:**
```javascript
this.socket.on('player_clicked', (data) => {
  this.notifyCallbacks('playerClick', data);
});
```

---

#### `game_finished`
Emitted when both players have clicked and winner is determined.

**Payload:**
```javascript
{
  gameId: string,
  goalTime: number,
  player1: {
    id: string,
    username: string,
    time: number,
    difference: number
  },
  player2: {
    id: string,
    username: string,
    time: number,
    difference: number
  },
  winner: {
    id: string,
    username: string
  } | null,
  duration: number  // Game duration in ms
}
```

**Frontend Handler:**
```javascript
this.socket.on('game_finished', (data) => {
  this.currentGame = null;
  this.notifyCallbacks('gameEnd', data);
});
```

---

## Error & Disconnect Events

### Server → Client

#### `opponent_disconnected`
Emitted when opponent loses connection during game.

**Payload:**
```javascript
{
  message: string,
  disconnectedPlayer: {
    id: string,
    username: string
  }
}
```

**Frontend Handler:**
```javascript
this.socket.on('opponent_disconnected', (data) => {
  this.notifyCallbacks('opponentDisconnected', data);
});
```

---

#### `game_error`
Emitted when an error occurs during gameplay.

**Payload:**
```javascript
{
  message: string,
  code?: string
}
```

**Frontend Handler:**
```javascript
this.socket.on('game_error', (data) => {
  console.error('Game error:', data);
  this.notifyCallbacks('error', data);
});
```

---

## Additional Client Events

### Client → Server

#### `player_ready`
Signal that player is ready to start (optional, depends on game mode).

**Payload:**
```javascript
{
  gameId: string
}
```

---

#### `leave_game`
Player voluntarily leaves the game.

**Payload:**
```javascript
{
  gameId: string
}
```

---

#### `forfeit_game`
Player surrenders/forfeits the match.

**Payload:**
```javascript
{
  gameId: string
}
```

**Frontend Implementation:**
```javascript
forfeitGame() {
  if (!this.socket || !this.currentGame) {
    throw new Error('Not connected to a game');
  }
  
  this.socket.emit('forfeit_game', {
    gameId: this.currentGame.id
  });
}
```

---

## Event Flow Diagram

```
MATCHMAKING PHASE:
Client: join_game → Server
Server: game_matched → All Clients
Server: player_connection_update → All Clients

COUNTDOWN PHASE:
Server: game_countdown_start → All Clients (3-2-1 countdown)

GAMEPLAY PHASE:
Server: game_start → All Clients
Server: goal_time_set → All Clients

Client: player_click → Server
Server: click_registered → Sender
Server: player_clicked → All Clients

END PHASE:
Server: game_finished → All Clients (with results)
```

---

## Frontend Usage Example

```javascript
import { gameManager } from '../utils/game-manager.js';

// Initialize connection
await gameManager.connect();

// Subscribe to events
gameManager.on('gameMatched', (data) => {
  console.log('Matched with:', data.game.player2.username);
});

gameManager.on('gameStart', (data) => {
  console.log('Game starting! Goal time:', data.goalTime);
  startTimer();
});

gameManager.on('playerClick', (data) => {
  console.log(`Player ${data.playerId} clicked at ${data.clickTime}ms`);
});

gameManager.on('gameEnd', (data) => {
  console.log('Winner:', data.winner.username);
  displayResults(data);
});

// Join a game
await gameManager.joinGame(gameId);

// Player clicks
gameManager.playerClick(measuredTime);
```

---

## Backend Implementation Notes

### gameSocket.js Key Methods:

1. **handleJoinGame()** - Player joins, emits `game_joined`
2. **startGameCountdown()** - Countdown before game, emits `game_countdown_start`
3. **startGameplay()** - Game begins, emits `game_start` + `goal_time_set`
4. **handlePlayerClick()** - Registers click, emits `click_registered` + `player_clicked`
5. **finishGame()** - Determines winner, emits `game_finished`

### Authentication
Socket.IO uses session middleware to authenticate users:
```javascript
socket.request.session.userId
```

---

## Testing Checklist

- [x] Backend emits `game_start` ✅
- [x] Backend emits `goal_time_set` ✅
- [x] Backend emits `player_clicked` ✅
- [x] Backend emits `game_finished` ✅
- [x] Frontend listens to all events ✅
- [x] Event payloads match between backend/frontend ✅
- [ ] End-to-end game flow tested (pending duel.html connection)

---

## Next Steps

1. Connect `challenge.html` to create games via API
2. Connect `duel.html` to use Socket.IO events for real-time gameplay
3. Test full game flow with two players
4. Add reconnection logic for disconnected players

---

**Last Updated:** December 1, 2025
**Status:** Events Aligned ✅
