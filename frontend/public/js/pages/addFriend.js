document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const searchInput = document.querySelector('.search');
  const searchBtn = document.querySelector('.filter-btn');
  const friendsGrid = document.querySelector('.friends-grid');

  let searchTimeout;

  async function searchUsers() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Enter at least 2 characters to search</p>';
      return;
    }

    try {
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Searching...</p>';
      
      const response = await window.api.searchUsers(query);
      const users = response.users || response;
      
      displayUsers(users);
    } catch (error) {
      window.PopupManager.error('Search Error', error.message || 'Failed to search users');
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Search failed</p>';
    }
  }

  function displayUsers(users) {
    if (!users || users.length === 0) {
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">No users found</p>';
      return;
    }

    friendsGrid.innerHTML = '';
    
    console.log('Displaying users:', users);
    
    users.forEach(user => {
      console.log('User data:', user);
      
      const card = document.createElement('div');
      card.className = 'friend-card';
      
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.textContent = user.username.charAt(0).toUpperCase();
      
      const name = document.createElement('span');
      name.className = 'user-name';
      name.textContent = user.username;
      
      const btn = document.createElement('button');
      btn.className = 'btn--secondary';
      btn.textContent = 'ADD FRIEND';
      btn.onclick = (e) => {
        e.stopPropagation();
        sendFriendRequest(user.id, user.username, btn);
      };
      
      card.onclick = () => {
        window.location.href = `/pages/otherProfile.html?userId=${user.id}`;
      };
      
      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(btn);
      
      friendsGrid.appendChild(card);
    });
  }

  async function sendFriendRequest(userId, username, button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'SENDING...';
    
    console.log('Sending friend request to:', userId, username);
    
    if (!userId) {
      console.error('No userId provided');
      if (window.PopupManager) {
        window.PopupManager.error('Error', 'User ID is missing');
      } else {
        alert('Error: User ID is missing');
      }
      button.disabled = false;
      button.textContent = originalText;
      return;
    }
    
    try {
      console.log('Calling API sendFriendRequest...');
      const response = await window.api.sendFriendRequest(userId);
      console.log('Friend request sent successfully:', response);
      
      button.textContent = 'REQUEST SENT';
      button.style.backgroundColor = '#6c757d';
      
      if (window.PopupManager) {
        window.PopupManager.success('Success', `Friend request sent to ${username}`);
      } else {
        alert(`Friend request sent to ${username}`);
      }
    } catch (error) {
      console.error('Friend request error:', error);
      console.error('Error message:', error.message);
      
      // Ensure we always reset the button
      button.disabled = false;
      button.textContent = originalText;
      
      // Handle different error codes
      const errorMsg = error.message || '';
      
      if (!window.PopupManager) {
        alert('Error: ' + errorMsg);
        return;
      }
      
      if (errorMsg.includes('already sent you a friend request')) {
        window.PopupManager.success('Invitation Received', `${username} has already sent you a friend request. Check your pending invitations to accept it.`);
      } else if (errorMsg.includes('already sent a friend request')) {
        window.PopupManager.success('Already Sent', `You have already sent a friend request to ${username}. Wait for them to accept it.`);
      } else if (errorMsg.includes('Already friends')) {
        window.PopupManager.success('Already Friends', `You are already friends with ${username}.`);
      } else {
        window.PopupManager.error('Error', errorMsg || 'Failed to send friend request');
      }
    }
  }

  searchBtn.addEventListener('click', searchUsers);
  
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchUsers();
    } else {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(searchUsers, 500);
    }
  });

  friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Enter a username to search</p>';
});
