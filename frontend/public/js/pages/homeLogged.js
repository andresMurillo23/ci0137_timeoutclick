// Home page functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!window.auth.requireAuth()) return;
  
  const challengeFriendsBtn = document.getElementById('challengeFriendsBtn');
  const quickMatchBtn = document.getElementById('quickMatchBtn');
  const friendsListModal = document.getElementById('friendsListModal');
  const friendsList = document.getElementById('friendsList');

  // Challenge friends functionality
  challengeFriendsBtn.addEventListener('click', async () => {
    try {
      const friends = await window.api.getFriends();
      showFriendsModal(friends);
    } catch (error) {
      alert('Failed to load friends list: ' + error.message);
    }
  });

  // Quick match functionality
  quickMatchBtn.addEventListener('click', async () => {
    quickMatchBtn.disabled = true;
    quickMatchBtn.textContent = 'FINDING MATCH...';
    
    try {
      // For now, redirect to challenge page
      // In a full implementation, this would find a random opponent
      alert('Quick match feature coming soon! Please challenge a friend instead.');
    } catch (error) {
      alert('Failed to find match: ' + error.message);
    } finally {
      quickMatchBtn.disabled = false;
      quickMatchBtn.textContent = 'QUICK MATCH';
    }
  });

  // Show friends modal
  function showFriendsModal(friends) {
    friendsList.innerHTML = '';
    
    if (friends.length === 0) {
      friendsList.innerHTML = '<p>No friends available. Add some friends first!</p>';
    } else {
      friends.forEach(friend => {
        const friendDiv = document.createElement('div');
        friendDiv.className = 'friend-item';
        friendDiv.innerHTML = `
          <span>${friend.username}</span>
          <button class="btn btn--small" onclick="challengeFriend('${friend._id}', '${friend.username}')">Challenge</button>
        `;
        friendsList.appendChild(friendDiv);
      });
    }
    
    friendsListModal.style.display = 'block';
  }

  // Challenge specific friend
  window.challengeFriend = async (friendId, friendName) => {
    try {
      const result = await window.api.createChallenge(friendId);
      closeFriendsModal();
      
      // Redirect to game page
      window.location.href = `/pages/duel.html?gameId=${result.game._id}`;
    } catch (error) {
      alert(`Failed to challenge ${friendName}: ${error.message}`);
    }
  };

  // Close friends modal
  window.closeFriendsModal = () => {
    friendsListModal.style.display = 'none';
  };

  // Close modal when clicking outside
  friendsListModal.addEventListener('click', (e) => {
    if (e.target === friendsListModal) {
      closeFriendsModal();
    }
  });
});