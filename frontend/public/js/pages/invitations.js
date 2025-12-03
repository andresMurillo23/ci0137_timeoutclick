document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const searchInput = document.querySelector('.search');
  const searchBtn = document.querySelector('.search-bar .btn--primary-brown');
  const receivedPanel = document.getElementById('receivedPanel');
  const sentPanel = document.getElementById('sentPanel');
  const receivedGrid = receivedPanel.querySelector('.invitations-grid');
  const sentGrid = sentPanel.querySelector('.invitations-grid');
  const tabs = document.querySelectorAll('.tab');

  let receivedInvitations = [];
  let sentInvitations = [];

  async function loadInvitations() {
    try {
      receivedGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Loading...</p>';
      sentGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Loading...</p>';

      const receivedResponse = await window.api.get('/friends/invitations/received');
      receivedInvitations = receivedResponse.invitations || receivedResponse;
      
      const sentResponse = await window.api.get('/friends/invitations/sent');
      sentInvitations = sentResponse.invitations || sentResponse;
      
      displayReceivedInvitations(receivedInvitations);
      displaySentInvitations(sentInvitations);
    } catch (error) {
      console.error('Failed to load invitations:', error);
      receivedGrid.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff4444;">Failed to load invitations</p>';
      sentGrid.innerHTML = '<p style="text-align: center; padding: 20px; color: #ff4444;">Failed to load invitations</p>';
    }
  }

  function displayReceivedInvitations(invitations) {
    if (!invitations || invitations.length === 0) {
      receivedGrid.innerHTML = '<p style="text-align: center; padding: 20px;">No pending invitations</p>';
      return;
    }

    receivedGrid.innerHTML = '';
    
    invitations.forEach(invitation => {
      const card = document.createElement('div');
      card.className = 'invitation-card';
      
      const statusDot = document.createElement('span');
      statusDot.className = 'status-dot on';
      
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.textContent = invitation.sender.username.charAt(0).toUpperCase();
      
      const info = document.createElement('div');
      info.className = 'invitation-info';
      
      const name = document.createElement('div');
      name.className = 'user-name';
      name.textContent = invitation.sender.username;
      
      const meta = document.createElement('div');
      meta.className = 'invitation-meta';
      meta.textContent = getTimeAgo(invitation.createdAt);
      
      info.appendChild(name);
      info.appendChild(meta);
      
      const actions = document.createElement('div');
      actions.className = 'invitation-actions';
      
      const declineBtn = document.createElement('button');
      declineBtn.className = 'btn btn--back';
      declineBtn.textContent = 'DECLINE';
      declineBtn.onclick = () => respondToInvitation(invitation.id, 'decline');
      
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'btn btn--secondary';
      acceptBtn.textContent = 'ACCEPT';
      acceptBtn.onclick = () => respondToInvitation(invitation.id, 'accept');
      
      actions.appendChild(declineBtn);
      actions.appendChild(acceptBtn);
      
      card.appendChild(statusDot);
      card.appendChild(avatar);
      card.appendChild(info);
      card.appendChild(actions);
      
      receivedGrid.appendChild(card);
    });
  }

  function displaySentInvitations(invitations) {
    if (!invitations || invitations.length === 0) {
      sentGrid.innerHTML = '<p style="text-align: center; padding: 20px;">No sent invitations</p>';
      return;
    }

    sentGrid.innerHTML = '';
    
    invitations.forEach(invitation => {
      const card = document.createElement('div');
      card.className = 'invitation-card';
      
      const statusDot = document.createElement('span');
      statusDot.className = 'status-dot off';
      
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.textContent = invitation.receiver.username.charAt(0).toUpperCase();
      
      const info = document.createElement('div');
      info.className = 'invitation-info';
      
      const name = document.createElement('div');
      name.className = 'user-name';
      name.textContent = invitation.receiver.username;
      
      const meta = document.createElement('div');
      meta.className = 'invitation-meta';
      meta.textContent = 'Pending - ' + getTimeAgo(invitation.createdAt);
      
      info.appendChild(name);
      info.appendChild(meta);
      
      const actions = document.createElement('div');
      actions.className = 'invitation-actions';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn--primary-brown';
      cancelBtn.textContent = 'CANCEL';
      cancelBtn.onclick = () => cancelInvitation(invitation.id);
      
      actions.appendChild(cancelBtn);
      
      card.appendChild(statusDot);
      card.appendChild(avatar);
      card.appendChild(info);
      card.appendChild(actions);
      
      sentGrid.appendChild(card);
    });
  }

  async function respondToInvitation(invitationId, action) {
    try {
      await window.api.put(`/friends/invitations/${invitationId}/${action}`);
      
      if (action === 'accept') {
        window.PopupManager.success('¡Éxito!', 'Solicitud de amistad aceptada');
      }
      
      loadInvitations();
    } catch (error) {
      window.PopupManager.error('Error', `Could not ${action === 'accept' ? 'accept' : 'decline'} invitation: ` + error.message);
    }
  }

  async function cancelInvitation(invitationId) {
    try {
      await window.api.delete(`/friends/invitations/${invitationId}`);
      loadInvitations();
    } catch (error) {
      window.PopupManager.error('Error', 'Could not cancel invitation: ' + error.message);
    }
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  function searchInvitations() {
    const query = searchInput.value.toLowerCase().trim();
    
    const currentPanel = document.querySelector('.invitations-grid-container:not([hidden])');
    const isReceived = currentPanel === receivedPanel;
    
    if (!query) {
      if (isReceived) {
        displayReceivedInvitations(receivedInvitations);
      } else {
        displaySentInvitations(sentInvitations);
      }
      return;
    }

    if (isReceived) {
      const filtered = receivedInvitations.filter(inv => 
        inv.sender.username.toLowerCase().includes(query)
      );
      displayReceivedInvitations(filtered);
    } else {
      const filtered = sentInvitations.filter(inv => 
        inv.receiver.username.toLowerCase().includes(query)
      );
      displaySentInvitations(filtered);
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      
      if (index === 0) {
        receivedPanel.hidden = false;
        sentPanel.hidden = true;
      } else {
        receivedPanel.hidden = true;
        sentPanel.hidden = false;
      }
    });
  });

  searchBtn.addEventListener('click', searchInvitations);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchInvitations();
    }
  });

  loadInvitations();
});
