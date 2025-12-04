document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const searchInput = document.querySelector('.search');
  const searchBtn = document.querySelector('.search-bar .btn--primary-brown');
  const friendsGrid = document.querySelector('.friends-grid');

  let allFriends = [];

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
      friendsGrid.innerHTML = '<p style="text-align: center; padding: 20px;">No friends yet.</p>';
      return;
    }

    friendsGrid.innerHTML = '';
    
    friends.forEach(friend => {
      const card = document.createElement('div');
      card.className = 'friend-card';
      
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.textContent = friend.username.charAt(0).toUpperCase();
      
      const name = document.createElement('span');
      name.className = 'user-name';
      name.textContent = friend.username;
      
      card.onclick = () => {
        const friendId = friend._id || friend.id;
        window.location.href = `/pages/deleteFriend.html?userId=${friendId}`;
      };
      
      card.appendChild(avatar);
      card.appendChild(name);
      
      friendsGrid.appendChild(card);
    });
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
  
  searchBtn.addEventListener('click', searchFriends);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchFriends();
    }
  });

  loadFriends();
});
