/**
 * Other Profile page - View another user's profile (non-friend)
 * Shows public information and allows sending friend request
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  // Get userId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');

  if (!userId) {
    window.PopupManager.error('Error', 'No user ID provided');
    setTimeout(() => {
      window.location.href = '/pages/addFriend.html';
    }, 2000);
    return;
  }

  // DOM elements
  const usernameElement = document.getElementById('username');
  const aboutElement = document.getElementById('about');
  const sinceElement = document.getElementById('since');
  const mutualElement = document.getElementById('mutual');
  const rankElement = document.getElementById('rank');
  const matchesElement = document.getElementById('matches');
  const avatarImg = document.querySelector('.op-avatar-frame img');
  const progressBar = document.querySelector('.progress');
  const addBtn = document.getElementById('addBtn');

  // Load user profile data
  async function loadUserProfile() {
    try {
      const response = await window.api.getUserProfile(userId);
      const user = response.user || response;

      // Update profile information
      if (usernameElement) usernameElement.textContent = user.username || 'Unknown';
      
      // Hide about field since they're not friends (remove the row)
      if (aboutElement) {
        const aboutRow = aboutElement.closest('.op-row');
        if (aboutRow) aboutRow.style.display = 'none';
      }

      // Hide mutual friends since they're not friends
      if (mutualElement) {
        const mutualRow = mutualElement.closest('.op-row');
        if (mutualRow) mutualRow.style.display = 'none';
      }
      
      // Format member since date
      if (sinceElement && user.createdAt) {
        const date = new Date(user.createdAt);
        sinceElement.textContent = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
      }

      // Update stats
      if (rankElement) {
        const wins = user.gameStats?.gamesWon || 0;
        let rank = 'Rookie';
        if (wins >= 100) rank = 'Legend';
        else if (wins >= 50) rank = 'Gold';
        else if (wins >= 25) rank = 'Silver';
        else if (wins >= 10) rank = 'Bronze';
        
        rankElement.textContent = rank;
      }
      
      if (matchesElement) {
        const gamesPlayed = user.gameStats?.gamesPlayed || 0;
        matchesElement.textContent = gamesPlayed;
      }

      // Update win rate
      if (progressBar) {
        const gamesPlayed = user.gameStats?.gamesPlayed || 0;
        const wins = user.gameStats?.gamesWon || 0;
        
        const winRate = gamesPlayed > 0 
          ? Math.round((wins / gamesPlayed) * 100)
          : 0;
        progressBar.style.setProperty('--winrate', `${winRate}%`);
      }

      // Update avatar if available
      if (avatarImg && user.avatar) {
        const backendUrl = window.CONFIG?.BACKEND_URL || 'http://localhost:3000';
        const avatarUrl = `${backendUrl}/uploads/${user.avatar}`;
        
        // For ngrok URLs, fetch with header to bypass warning page
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
        avatarImg.alt = `${user.username}'s avatar`;
      } else if (avatarImg && user.username) {
        // Show first letter if no avatar
        avatarImg.style.display = 'none';
        const avatarFrame = document.querySelector('.op-avatar-frame');
        if (avatarFrame) {
          avatarFrame.innerHTML = `<div class="user-avatar" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: var(--burnt-orange); color: var(--panel); border-radius: 50%;">${user.username.charAt(0).toUpperCase()}</div>`;
        }
      }

    } catch (error) {
      console.error('Failed to load user profile:', error);
      window.PopupManager.error('Error', 'Could not load user profile');
      setTimeout(() => {
        window.location.href = '/pages/addFriend.html';
      }, 2000);
    }
  }

  // Send friend request handler
  async function sendFriendRequest() {
    const originalText = addBtn.textContent;
    addBtn.disabled = true;
    addBtn.textContent = 'SENDING...';

    try {
      const userResponse = await window.api.getUserProfile(userId);
      const username = (userResponse.user || userResponse).username;

      const response = await window.api.sendFriendRequest(userId);
      
      addBtn.textContent = 'REQUEST SENT';
      addBtn.style.backgroundColor = '#6c757d';
      
      window.PopupManager.success('Success', `Friend request sent to ${username}`, 2000);
      
      // Redirect back to add friends page after 2 seconds
      setTimeout(() => {
        window.location.href = '/pages/addFriend.html';
      }, 2000);

    } catch (error) {
      console.error('Friend request error:', error);
      
      addBtn.disabled = false;
      addBtn.textContent = originalText;
      
      const errorMsg = error.message || '';
      
      if (errorMsg.includes('already sent you a friend request')) {
        window.PopupManager.success('Invitation Received', 'This user has already sent you a friend request. Check your pending invitations to accept it.');
      } else if (errorMsg.includes('already sent a friend request')) {
        window.PopupManager.success('Already Sent', 'You have already sent a friend request to this user. Wait for them to accept it.');
      } else if (errorMsg.includes('Already friends')) {
        window.PopupManager.success('Already Friends', 'You are already friends with this user.');
        setTimeout(() => {
          window.location.href = '/pages/friends.html';
        }, 2000);
      } else {
        window.PopupManager.error('Error', errorMsg || 'Failed to send friend request');
      }
    }
  }

  // Attach event listener to Add Friend button
  if (addBtn) {
    addBtn.addEventListener('click', sendFriendRequest);
  }

  // Load profile data on page load
  await loadUserProfile();
});
