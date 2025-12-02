/**
 * Challenge page - Challenge online players to a duel
 * Lists available players and sends challenge invitations
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth || !window.auth.requireAuth()) {
    window.location.href = '/pages/login.html';
    return;
  }

  const listContainer = document.querySelector('.list');
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

  /**
   * Initialize Socket.IO for real-time player status
   */
  async function initSocket() {
    const token = sessionStorage.getItem('authToken');
    if (!token) return;

    socket = io('http://localhost:3000', {
      auth: { token: token }
    });

    socket.on('connect', () => {
      console.log('[CHALLENGE] Connected to server');
    });

    socket.on('user_status_update', (data) => {
      updatePlayerStatus(data.userId, data.status);
    });

    socket.on('challenge_accepted', (data) => {
      console.log('[CHALLENGE] Challenge accepted:', data);
      closeModal();
      window.location.href = `/pages/duel.html?gameId=${data.gameId}`;
    });

    socket.on('challenge_declined', (data) => {
      console.log('[CHALLENGE] Challenge declined');
      closeModal();
      alert('Player declined your challenge');
      challengePending = false;
    });

    socket.on('challenge_timeout', () => {
      console.log('[CHALLENGE] Challenge timeout');
      closeModal();
      alert('Challenge timed out');
      challengePending = false;
    });
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
    if (!row) return;

    const statusDot = row.querySelector('.status-dot');
    const btn = row.querySelector('button');
    const username = row.querySelector('.username');

    row.classList.remove('available', 'busy', 'unavailable');

    if (status === 'online') {
      row.classList.add('available');
      statusDot.className = 'status-dot ok';
      btn.className = 'btn btn--secondary';
      btn.disabled = false;
      username.classList.remove('dim');
    } else if (status === 'in-game') {
      row.classList.add('busy');
      statusDot.className = 'status-dot busy';
      btn.className = 'btn-unavailable';
      btn.disabled = true;
      username.classList.remove('dim');
    } else {
      row.classList.add('unavailable');
      statusDot.className = 'status-dot no';
      btn.className = 'btn-unavailable';
      btn.disabled = true;
      username.classList.add('dim');
    }
  }

  /**
   * Open confirmation modal
   */
  function openConfirmModal(player) {
    selectedPlayer = player;
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

      // Send challenge via API
      const response = await window.api.post(`/games/challenge`, {
        opponentId: selectedPlayer.id
      });

      console.log('[CHALLENGE] Challenge sent:', response);

      // Wait for response via Socket.IO (challenge_accepted or challenge_declined)
    } catch (error) {
      console.error('[CHALLENGE] Failed to send challenge:', error);
      alert('Failed to send challenge: ' + (error.message || 'Unknown error'));
      closeModal();
    }
  }

  /**
   * Event listeners
   */
  noBtn.addEventListener('click', closeModal);

  yesBtn.addEventListener('click', sendChallenge);

  cancelWaitBtn.addEventListener('click', () => {
    // TODO: Cancel challenge via API
    closeModal();
  });

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
  await initSocket();
  await loadPlayers();
});
