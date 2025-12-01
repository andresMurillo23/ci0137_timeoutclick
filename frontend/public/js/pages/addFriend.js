document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const searchInput = document.querySelector('.search');
  const searchBtn = document.querySelector('.filter-btn');
  const friendsGrid = document.querySelector('.friends-grid');
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  errorMessage.style.display = 'none';
  document.querySelector('.panel').appendChild(errorMessage);

  let searchTimeout;

  async function searchUsers() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
      showError('Please enter at least 2 characters');
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Enter a username to search</p>';
      return;
    }

    try {
      hideError();
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Searching...</p>';
      
      const response = await window.api.searchUsers(query);
      const users = response.users || response;
      
      displayUsers(users);
    } catch (error) {
      showError('Search failed: ' + error.message);
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
    
    if (!userId) {
      showError('User ID is missing');
      button.disabled = false;
      button.textContent = originalText;
      return;
    }
    
    try {
      const response = await window.api.sendFriendRequest(userId);
      button.textContent = 'REQUEST SENT';
      button.style.backgroundColor = '#6c757d';
      showSuccess(`Friend request sent to ${username}`);
    } catch (error) {
      console.error('Friend request error:', error);
      showError('Failed to send request: ' + error.message);
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = '#ff4444';
    errorMessage.style.padding = '10px';
    errorMessage.style.marginTop = '10px';
    errorMessage.style.textAlign = 'center';
  }

  function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = '#4CAF50';
    errorMessage.style.padding = '10px';
    errorMessage.style.marginTop = '10px';
    errorMessage.style.textAlign = 'center';
    
    setTimeout(() => {
      hideError();
    }, 3000);
  }

  function hideError() {
    errorMessage.style.display = 'none';
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
