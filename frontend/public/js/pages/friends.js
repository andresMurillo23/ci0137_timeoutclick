document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const searchInput = document.querySelector('.search');
  const searchBtn = document.querySelector('.search-bar .btn--primary-brown');
  const friendsGrid = document.querySelector('.friends-grid');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const panelConfirm = document.getElementById('panelConfirm');
  const panelWaiting = document.getElementById('panelWaiting');
  const whoElement = document.getElementById('who');
  const whoWaitingElement = document.getElementById('whoWaiting');
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const cancelWaitBtn = document.getElementById('cancelWaitBtn');

  let allFriends = [];
  let currentChallengeFriend = null;
  let currentGameId = null;

  async function loadFriends() {
    try {
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Loading friends...</p>';
      
      const response = await window.api.getFriends();
      
      // Handle different response structures
      let friends = [];
      if (Array.isArray(response)) {
        friends = response;
      } else if (response && Array.isArray(response.friends)) {
        friends = response.friends;
      } else if (response && response.data && Array.isArray(response.data)) {
        friends = response.data;
      }
      
      allFriends = friends;
      displayFriends(allFriends);
    } catch (error) {
      console.error('Failed to load friends list:', error);
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff4444;">Failed to load friends list</p>';
    }
  }

  function displayFriends(friends) {
    if (!Array.isArray(friends)) {
      console.error('displayFriends received non-array:', friends);
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff4444;">Error loading friends</p>';
      return;
    }
    
    if (!friends || friends.length === 0) {
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">No friends yet. <a href="/pages/addFriend.html">Add some friends</a>!</p>';
      return;
    }

    friendsGrid.innerHTML = '';
    
    friends.forEach(friend => {
      const card = document.createElement('div');
      card.className = 'friend-card available';
      
      const statusDot = document.createElement('span');
      statusDot.className = 'status-dot on';
      
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.textContent = friend.username.charAt(0).toUpperCase();
      
      const name = document.createElement('span');
      name.className = 'user-name';
      name.textContent = friend.username;
      
      const btn = document.createElement('button');
      btn.className = 'btn--secondary challenge-btn';
      btn.textContent = 'CHALLENGE';
      btn.onclick = (e) => {
        e.stopPropagation();
        // Redirect to challenge page
        window.location.href = '/pages/challenge.html';
      };
      
      card.onclick = () => {
        const friendId = friend._id || friend.id;
        window.location.href = `/pages/deleteFriend.html?userId=${friendId}`;
      };
      
      card.appendChild(statusDot);
      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(btn);
      
      friendsGrid.appendChild(card);
    });
  }

  function showChallengeModal(friend) {
    currentChallengeFriend = friend;
    whoElement.textContent = friend.username;
    whoWaitingElement.textContent = friend.username;
    confirmOverlay.style.display = 'flex';
    panelConfirm.hidden = false;
    panelWaiting.hidden = true;
  }

  function hideModal() {
    confirmOverlay.style.display = 'none';
    panelConfirm.hidden = false;
    panelWaiting.hidden = true;
    currentChallengeFriend = null;
    currentGameId = null;
  }

  async function sendChallenge() {
    if (!currentChallengeFriend) return;

    panelConfirm.hidden = true;
    panelWaiting.hidden = false;

    try {
      const response = await window.api.createChallenge(currentChallengeFriend._id);
      currentGameId = response.game._id || response.gameId;
      
      setTimeout(() => {
        window.location.href = `/pages/duel.html?gameId=${currentGameId}`;
      }, 1500);
    } catch (error) {
      console.error('Failed to create challenge:', error);
      window.PopupManager.error('Error', 'Could not send challenge: ' + error.message);
      hideModal();
    }
  }

  async function cancelChallenge() {
    if (currentGameId) {
      try {
        await window.api.cancelGame(currentGameId);
      } catch (error) {
        console.error('Failed to cancel game:', error);
      }
    }
    hideModal();
  }

  function searchFriends() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
      displayFriends(allFriends);
      return;
    }

    const filtered = allFriends.filter(friend => 
      friend.username.toLowerCase().includes(query)
    );
    
    displayFriends(filtered);
  }

  yesBtn.addEventListener('click', sendChallenge);
  noBtn.addEventListener('click', hideModal);
  cancelWaitBtn.addEventListener('click', cancelChallenge);
  
  searchBtn.addEventListener('click', searchFriends);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchFriends();
    }
  });

  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
      cancelChallenge();
    }
  });

  loadFriends();
});
