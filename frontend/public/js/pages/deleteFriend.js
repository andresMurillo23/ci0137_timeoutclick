document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  // Get userId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');

  if (!userId) {
    window.PopupManager.error('Error', 'No user ID provided');
    setTimeout(() => {
      window.location.href = '/pages/friends.html';
    }, 2000);
    return;
  }

  // DOM elements
  const usernameElement = document.getElementById('username');
  const sinceElement = document.getElementById('since');
  const mutualElement = document.getElementById('mutual');
  const rankElement = document.getElementById('rank');
  const matchesElement = document.getElementById('matches');
  const avatarImg = document.querySelector('.op-avatar-frame img');
  const progressBar = document.querySelector('.progress');

  // Load friend data
  async function loadFriendData() {
    try {
      const response = await window.api.getUserProfile(userId);
      const friend = response.user || response;

      // Update profile information
      if (usernameElement) usernameElement.textContent = friend.username || 'Unknown';
      
      // Format member since date
      if (sinceElement && friend.createdAt) {
        const date = new Date(friend.createdAt);
        sinceElement.textContent = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
      }

      // Update stats - using gameStats structure
      if (rankElement) {
        // Calculate rank based on games won
        const wins = friend.gameStats?.gamesWon || 0;
        let rank = 'Rookie';
        if (wins >= 100) rank = 'Legend';
        else if (wins >= 50) rank = 'Gold';
        else if (wins >= 25) rank = 'Silver';
        else if (wins >= 10) rank = 'Bronze';
        
        rankElement.textContent = rank;
      }
      
      if (matchesElement) {
        const gamesPlayed = friend.gameStats?.gamesPlayed || 0;
        matchesElement.textContent = gamesPlayed;
      }

      // Update win rate
      if (progressBar) {
        const gamesPlayed = friend.gameStats?.gamesPlayed || 0;
        const wins = friend.gameStats?.gamesWon || 0;
        
        const winRate = gamesPlayed > 0 
          ? Math.round((wins / gamesPlayed) * 100)
          : 0;
        progressBar.style.setProperty('--winrate', `${winRate}%`);
      }

      // Update avatar if available
      if (avatarImg && friend.avatar) {
        // Avatar is stored as "avatars/filename.jpg", need to prepend backend URL
        const backendUrl = window.CONFIG?.BACKEND_URL || 'http://localhost:3000';
        const avatarUrl = `${backendUrl}/uploads/${friend.avatar}`;
        
        if (backendUrl.includes('ngrok')) {
          try {
            const response = await fetch(avatarUrl, {
              headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (response.ok) {
              const blob = await response.blob();
              avatarImg.src = URL.createObjectURL(blob);
            } else {
              avatarImg.src = '/assets/images/profile.jpg';
            }
          } catch (error) {
            console.error('Error fetching avatar:', error);
            avatarImg.src = '/assets/images/profile.jpg';
          }
        } else {
          avatarImg.src = avatarUrl;
        }
        avatarImg.alt = `${friend.username}'s avatar`;
      } else if (avatarImg && friend.username) {
        // Show first letter if no avatar
        avatarImg.style.display = 'none';
        const avatarFrame = document.querySelector('.op-avatar-frame');
        if (avatarFrame) {
          avatarFrame.innerHTML = `<div class="user-avatar" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: var(--burnt-orange); color: var(--panel); border-radius: 50%;">${friend.username.charAt(0).toUpperCase()}</div>`;
        }
      }

      // Get mutual friends count
      try {
        const mutualResponse = await window.api.getMutualFriends(userId);
        const mutualCount = mutualResponse.mutualFriends?.length ?? mutualResponse.count ?? 0;
        if (mutualElement) mutualElement.textContent = mutualCount;
      } catch (error) {
        console.error('Failed to load mutual friends:', error);
        if (mutualElement) mutualElement.textContent = '0';
      }

    } catch (error) {
      console.error('Failed to load friend data:', error);
      window.PopupManager.error('Error', 'Could not load friend profile');
      setTimeout(() => {
        window.location.href = '/pages/friends.html';
      }, 2000);
    }
  }

  // Listen for delete confirmation
  document.addEventListener('friend.delete.confirm', async (e) => {
    const username = e.detail?.username;
    
    try {
      await window.api.removeFriend(userId);
      window.PopupManager.success('Success', `${username} has been removed from your friends list`, true);
      
      // Redirect immediately
      window.location.href = '/pages/friends.html';
    } catch (error) {
      console.error('Failed to delete friend:', error);
      window.PopupManager.error('Error', 'Could not remove friend: ' + error.message);
    }
  });

  // Load friend data on page load
  await loadFriendData();
});
