// Home page functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!window.auth.requireAuth()) return;
  
  // No additional JavaScript needed - buttons use onclick redirects

  // Show friends modal
  function showFriendsModal(friends) {
    friendsList.innerHTML = '';
    
    if (!Array.isArray(friends) || friends.length === 0) {
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
      window.PopupManager.error('Error', `Could not challenge ${friendName}: ${error.message}`);
    }
  };
});