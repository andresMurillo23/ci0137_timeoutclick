/**
 * Challenge page - Challenge online players to a duel
 * Lists available players and sends challenge invitations
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth || !window.auth.requireAuth()) {
    window.location.href = '/pages/login.html';
    return;
  }

  const listContainer = document.getElementById('playersList');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const panelConfirm = document.getElementById('panelConfirm');
  const panelWaiting = document.getElementById('panelWaiting');
  const whoSpan = document.getElementById('who');
  const whoWaitingSpan = document.getElementById('whoWaiting');
  const noBtn = document.getElementById('noBtn');
  const yesBtn = document.getElementById('yesBtn');
  const cancelWaitBtn = document.getElementById('cancelWaitBtn');

  let selectedPlayer = null;
  let challengePending = false;
  let socket = null;
  let currentGameId = null;
  let pendingChallenges = [];

  /**
   * Clean up old waiting games from this user
   */
  async function cleanupOldGames() {
    try {
      console.log('[CHALLENGE] Cleaning up old waiting games...');
      
      // Only cleanup waiting games (not active ones)
      await window.api.post('/games/cleanup');
      
      console.log('[CHALLENGE] Waiting games cleaned up');
    } catch (error) {
      console.error('[CHALLENGE] Failed to cleanup old games:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Debug: Check current game status
   */
  async function checkGameStatus() {
    try {
      const status = await window.api.get('/games/debug-status');
      console.log('[CHALLENGE] Game status:', status);
      console.table(status.games);
      return status;
    } catch (error) {
      console.error('[CHALLENGE] Failed to check status:', error);
    }
  }

  /**
   * Force cleanup all stuck games (manual emergency function)
   */
  async function forceCleanupAllGames() {
    try {
      console.log('[CHALLENGE] Force cleaning all stuck games...');
      const forceResult = await window.api.post('/games/force-cleanup');
      console.log('[CHALLENGE] Force cleanup result:', forceResult);
      
      if (forceResult.gamesCancelled > 0) {
        window.PopupManager.success('Limpieza Completada', `Se cancelaron ${forceResult.gamesCancelled} juegos atascados`);
      } else {
        window.PopupManager.success('Todo en Orden', 'No se encontraron juegos atascados');
      }
      
      // Show updated status
      await checkGameStatus();
    } catch (error) {
      console.error('[CHALLENGE] Failed to force cleanup:', error);
      window.PopupManager.error('Error', 'Could not clean up games');
    }
  }

  // Expose functions globally for manual use via console
  window.checkGameStatus = checkGameStatus;
  window.forceCleanupGames = forceCleanupAllGames;

  /**
   * Initialize Socket.IO for real-time player status
   */
  async function initSocket() {
    const token = sessionStorage.getItem('authToken');
    if (!token) return;

    socket = io('http://localhost:3000', {
      auth: { token: token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socket.on('connect', () => {
      console.log('[CHALLENGE] Connected to server, socket ID:', socket.id);
      // Request online users status after connection
      setTimeout(() => {
        if (socket && socket.connected) {
          console.log('[CHALLENGE] Requesting online users status...');
          socket.emit('get_online_users');
        }
      }, 500);
    });

    socket.on('disconnect', (reason) => {
      console.log('[CHALLENGE] Disconnected from server:', reason);
    });

    socket.on('user_status_update', (data) => {
      updatePlayerStatus(data.userId, data.status);
    });

    // Listen for user connection/disconnection events
    socket.on('user_connected', (data) => {
      console.log('[CHALLENGE] User connected:', data.username);
      updatePlayerStatus(data.userId, 'online');
    });

    socket.on('user_disconnected', (data) => {
      console.log('[CHALLENGE] User disconnected:', data.username);
      updatePlayerStatus(data.userId, 'offline');
    });

    // Listen for online users updates
    socket.on('online_users_update', (data) => {
      console.log('[CHALLENGE] Online users update - Count:', data.count);
      console.log('[CHALLENGE] Online users:', data.users.map(u => u.username).join(', '));
      updateAllPlayersStatus(data.users);
    });

    // Receive incoming challenges
    socket.on('challenge_received', (data) => {
      console.log('[CHALLENGE] Challenge received:', data);
      addChallengeNotification(data);
    });

    // Challenge accepted by opponent
    socket.on('challenge_accepted', (data) => {
      console.log('[CHALLENGE] Challenge accepted:', data);
      closeModal();
      window.location.href = `/pages/duel.html?gameId=${data.gameId}`;
    });

    // Challenge declined by opponent
    socket.on('challenge_declined', (data) => {
      console.log('[CHALLENGE] Challenge declined');
      closeModal();
      window.PopupManager.error('Challenge Declined', `${data.declinedBy} declined your challenge`);
      challengePending = false;
      currentGameId = null;
    });

    // Challenge cancelled by sender
    socket.on('challenge_cancelled', (data) => {
      console.log('[CHALLENGE] Challenge cancelled by sender');
      removeChallengeNotification(data.gameId);
    });

    socket.on('challenge_error', (data) => {
      console.error('[CHALLENGE] Error:', data.message);
      closeModal();
      
      // Show proper styled error popup
      let errorMessage = data.message || 'Unknown error';
      if (errorMessage.includes('not online')) {
        errorMessage = 'The player is not currently online. Please try again later.';
      }
      
      window.PopupManager.error('Challenge Failed', errorMessage);
      
      challengePending = false;
      currentGameId = null;
    });
  }

  /**
   * Add challenge notification to the UI
   */
  function addChallengeNotification(challenge) {
    const notificationsSection = document.querySelector('.notifications');
    if (!notificationsSection) return;

    // Remove "No notifications" message if present
    const noNotifications = notificationsSection.querySelector('p');
    if (noNotifications && noNotifications.textContent.includes('No pending')) {
      noNotifications.remove();
    }

    // Check if notification already exists
    if (document.getElementById(`challenge-${challenge.gameId}`)) return;

    // Add to pending challenges
    pendingChallenges.push(challenge);

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification-item';
    notification.id = `challenge-${challenge.gameId}`;
    notification.innerHTML = `
      <div class="notification-content">
        <p><strong>${challenge.challenger.username}</strong> wants to duel!</p>
      </div>
      <div class="notification-actions">
        <button class="btn-accept" data-game-id="${challenge.gameId}" data-challenger-id="${challenge.challengerId}">ACCEPT</button>
        <button class="btn-decline" data-game-id="${challenge.gameId}" data-challenger-id="${challenge.challengerId}">DECLINE</button>
      </div>
    `;

    notificationsSection.appendChild(notification);

    // Add event listeners
    const acceptBtn = notification.querySelector('.btn-accept');
    const declineBtn = notification.querySelector('.btn-decline');

    acceptBtn.addEventListener('click', () => handleAcceptChallenge(challenge));
    declineBtn.addEventListener('click', () => handleDeclineChallenge(challenge));
  }

  /**
   * Remove challenge notification from UI
   */
  function removeChallengeNotification(gameId) {
    const notification = document.getElementById(`challenge-${gameId}`);
    if (notification) {
      notification.remove();
    }

    // Remove from pending challenges
    pendingChallenges = pendingChallenges.filter(c => c.gameId !== gameId);

    // Show "No notifications" if empty
    const notificationsSection = document.querySelector('.notifications');
    if (notificationsSection && notificationsSection.children.length === 0) {
      notificationsSection.innerHTML = '<p style="text-align: center; padding: 20px;">No pending challenges</p>';
    }
  }

  /**
   * Handle accepting a challenge
   */
  async function handleAcceptChallenge(challenge) {
    try {
      // Emit accept event via socket
      socket.emit('accept_challenge', {
        gameId: challenge.gameId,
        challengerId: challenge.challengerId
      });

      // Remove notification
      removeChallengeNotification(challenge.gameId);

      // Wait for server confirmation, then redirect
    } catch (error) {
      console.error('[CHALLENGE] Failed to accept:', error);
      window.PopupManager.error('Error', 'Could not accept challenge');
    }
  }

  /**
   * Handle declining a challenge
   */
  async function handleDeclineChallenge(challenge) {
    try {
      // Emit decline event via socket
      socket.emit('decline_challenge', {
        gameId: challenge.gameId,
        challengerId: challenge.challengerId
      });

      // Remove notification
      removeChallengeNotification(challenge.gameId);

      // Show confirmation
      console.log('[CHALLENGE] Challenge declined');
    } catch (error) {
      console.error('[CHALLENGE] Failed to decline:', error);
      window.PopupManager.error('Error', 'Could not decline challenge');
    }
  }

  /**
   * Load available players
   */
  async function loadPlayers() {
    try {
      listContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Loading players...</p>';

      // Get friends list
      const response = await window.api.getFriends();
      
      console.log('[CHALLENGE] API Response:', response);
      console.log('[CHALLENGE] Response type:', typeof response);
      console.log('[CHALLENGE] Is array?', Array.isArray(response));
      
      // Handle different response structures
      let friends = [];
      if (Array.isArray(response)) {
        friends = response;
      } else if (response && Array.isArray(response.friends)) {
        friends = response.friends;
      } else if (response && response.data && Array.isArray(response.data)) {
        friends = response.data;
      } else {
        console.error('[CHALLENGE] Unexpected response structure:', response);
        listContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff4444;">Error: Unexpected data format</p>';
        return;
      }

      console.log('[CHALLENGE] Parsed friends:', friends);
      console.log('[CHALLENGE] Friends count:', friends.length);

      if (!friends || friends.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No friends available to challenge.<br>Add friends first!</p>';
        return;
      }

      displayPlayers(friends);
    } catch (error) {
      console.error('[CHALLENGE] Failed to load players:', error);
      console.error('[CHALLENGE] Error stack:', error.stack);
      listContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: #ff4444;">Failed to load players: ${error.message}</p>`;
    }
  }

  /**
   * Display players list
   */
  function displayPlayers(players) {
    console.log('[CHALLENGE] displayPlayers called with:', players);
    
    if (!Array.isArray(players)) {
      console.error('[CHALLENGE] displayPlayers received non-array:', typeof players, players);
      listContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff4444;">Error: Invalid player data</p>';
      return;
    }

    listContainer.innerHTML = '';

    if (players.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No friends available to challenge.<br>Add friends first!</p>';
      return;
    }

    players.forEach(player => {
      console.log('[CHALLENGE] Processing player:', player);
      
      const row = document.createElement('div');
      row.className = 'row available';
      row.dataset.userId = player.id || player._id;

      const label = document.createElement('div');
      label.className = 'label';

      const statusDot = document.createElement('span');
      statusDot.className = 'status-dot ok';
      statusDot.setAttribute('aria-hidden', 'true');

      const username = document.createElement('span');
      username.className = 'username';
      username.textContent = player.username;

      label.appendChild(statusDot);
      label.appendChild(username);

      const action = document.createElement('div');
      action.className = 'action';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--secondary';
      btn.textContent = 'CHALLENGE';
      btn.addEventListener('click', () => openConfirmModal(player));

      action.appendChild(btn);

      row.appendChild(label);
      row.appendChild(action);

      listContainer.appendChild(row);
    });
  }

  /**
   * Update player status in real-time
   */
  function updatePlayerStatus(userId, status) {
    const row = listContainer.querySelector(`[data-user-id="${userId}"]`);
    if (!row) {
      console.log('[CHALLENGE] Row not found for user:', userId);
      return;
    }

    const statusDot = row.querySelector('.status-dot');
    const btn = row.querySelector('button');
    const username = row.querySelector('.username');

    row.classList.remove('available', 'busy', 'unavailable');

    if (status === 'online') {
      row.classList.add('available');
      statusDot.className = 'status-dot ok';
      btn.className = 'btn btn--secondary';
      btn.disabled = false;
      btn.textContent = 'CHALLENGE';
      username.classList.remove('dim');
    } else if (status === 'in-game') {
      row.classList.add('busy');
      statusDot.className = 'status-dot busy';
      btn.className = 'btn-unavailable';
      btn.disabled = true;
      btn.textContent = 'IN GAME';
      username.classList.remove('dim');
    } else {
      // offline or any other status
      row.classList.add('unavailable');
      statusDot.className = 'status-dot no';
      btn.className = 'btn-unavailable';
      btn.disabled = true;
      btn.textContent = 'OFFLINE';
      username.classList.add('dim');
    }
  }

  /**
   * Update all players status based on online users list
   */
  function updateAllPlayersStatus(onlineUsers) {
    if (!onlineUsers || !Array.isArray(onlineUsers)) {
      console.error('[CHALLENGE] Invalid onlineUsers data:', onlineUsers);
      return;
    }

    // Create a map of online user IDs for quick lookup (normalize to string)
    const onlineUserIds = new Set(onlineUsers.map(u => String(u.userId)));
    
    console.log('[CHALLENGE] Online user IDs:', Array.from(onlineUserIds));

    // Update all players in the list
    const allRows = listContainer.querySelectorAll('[data-user-id]');
    console.log('[CHALLENGE] Total players in list:', allRows.length);
    
    allRows.forEach(row => {
      const userId = String(row.dataset.userId); // Normalize to string
      const isOnline = onlineUserIds.has(userId);
      
      console.log(`[CHALLENGE] User ${userId}: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      updatePlayerStatus(userId, isOnline ? 'online' : 'offline');
    });
  }

  /**
   * Open confirmation modal
   */
  function openConfirmModal(player) {
    console.log('[CHALLENGE] Opening modal for player:', player);
    selectedPlayer = {
      id: player.id || player._id,
      username: player.username,
      avatar: player.avatar
    };
    whoSpan.textContent = player.username;
    whoWaitingSpan.textContent = player.username;

    panelConfirm.hidden = false;
    panelWaiting.hidden = true;
    confirmOverlay.setAttribute('aria-hidden', 'false');
    confirmOverlay.style.display = 'flex';
  }

  /**
   * Close modal
   */
  function closeModal() {
    confirmOverlay.setAttribute('aria-hidden', 'true');
    confirmOverlay.style.display = 'none';
    selectedPlayer = null;
    challengePending = false;
  }

  /**
   * Send challenge
   */
  async function sendChallenge() {
    if (!selectedPlayer || challengePending) return;

    try {
      challengePending = true;

      // Switch to waiting panel
      panelConfirm.hidden = true;
      panelWaiting.hidden = false;

      console.log('[CHALLENGE] Sending challenge to:', selectedPlayer);

      // Send challenge via API
      const response = await window.api.post(`/games/challenge`, {
        opponentId: selectedPlayer.id
      });

      console.log('[CHALLENGE] Challenge sent:', response);
      
      // Store game ID for potential cancellation
      currentGameId = response.game?.id || response.game?._id || response.gameId;
      
      console.log('[CHALLENGE] Game ID:', currentGameId);
      console.log('[CHALLENGE] Opponent ID:', selectedPlayer.id);
      console.log('[CHALLENGE] Socket connected:', socket?.connected);

      // Emit socket event to notify opponent in real-time
      if (socket && currentGameId) {
        const challengeData = {
          gameId: String(currentGameId),
          opponentId: String(selectedPlayer.id)
        };
        console.log('[CHALLENGE] Emitting send_challenge:', challengeData);
        socket.emit('send_challenge', challengeData);
      } else {
        console.error('[CHALLENGE] Cannot emit challenge - socket or gameId missing');
      }

      // Wait for response via Socket.IO (challenge_accepted or challenge_declined)
    } catch (error) {
      console.error('[CHALLENGE] Failed to send challenge:', error);
      window.PopupManager.error('Error', 'Could not send challenge: ' + (error.message || 'Unknown error'));
      closeModal();
    }
  }

  /**
   * Cancel pending challenge
   */
  function cancelChallenge() {
    if (!currentGameId || !selectedPlayer) return;

    // Emit cancel event via socket
    if (socket) {
      socket.emit('cancel_challenge', {
        gameId: currentGameId,
        opponentId: selectedPlayer.id
      });
    }

    closeModal();
  }

  /**
   * Event listeners
   */
  noBtn.addEventListener('click', closeModal);

  yesBtn.addEventListener('click', sendChallenge);

  cancelWaitBtn.addEventListener('click', cancelChallenge);

  // Close modal on overlay click
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      closeModal();
    }
  });

  /**
   * Clean up on page unload
   */
  window.addEventListener('beforeunload', () => {
    if (socket) {
      socket.disconnect();
    }
  });

  // Initialize
  await cleanupOldGames();
  await initSocket();
  await loadPlayers();
  
  // The online status will be requested automatically in socket.on('connect')
});
