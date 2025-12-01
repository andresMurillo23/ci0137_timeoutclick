document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const filterBtn = document.querySelector('.btn--filter');
  const filterType = document.getElementById('filter-type');
  const fromDate = document.getElementById('from-date');
  const toDate = document.getElementById('to-date');
  const tbody = document.querySelector('tbody');

  let allHistory = [];

  async function loadHistory() {
    try {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading history...</td></tr>';
      
      const response = await window.api.getGameHistory(1, 100);
      allHistory = response.games || response;
      
      displayHistory(allHistory);
    } catch (error) {
      console.error('Failed to load history:', error);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ff4444;">Failed to load history</td></tr>';
    }
  }

  function displayHistory(games) {
    if (!games || games.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No games played yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    games.forEach(game => {
      const row = document.createElement('tr');
      
      const date = new Date(game.createdAt || game.date);
      const dateStr = date.toLocaleDateString();
      
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      const isPlayer1 = game.player1._id === currentUser.id || game.player1._id === currentUser._id;
      const opponent = isPlayer1 ? game.player2 : game.player1;
      const myTime = isPlayer1 ? game.player1Time : game.player2Time;
      const opponentTime = isPlayer1 ? game.player2Time : game.player1Time;
      
      let winner = '-';
      if (game.winner) {
        winner = game.winner === currentUser.id || game.winner === currentUser._id ? 'You' : opponent.username;
      }
      
      row.innerHTML = `
        <td>${dateStr}</td>
        <td>${opponent.username}</td>
        <td>${opponentTime ? opponentTime.toFixed(2) : '-'}</td>
        <td>${myTime ? myTime.toFixed(2) : '-'}</td>
        <td>${game.goalTime || '-'}</td>
        <td>${winner}</td>
      `;
      
      tbody.appendChild(row);
    });
  }

  function filterHistory() {
    const type = filterType.value;
    const from = new Date(fromDate.value);
    const to = new Date(toDate.value);
    
    let filtered = allHistory;
    
    if (type !== 'all') {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      const userId = currentUser.id || currentUser._id;
      
      filtered = filtered.filter(game => {
        if (type === 'wins') {
          return game.winner === userId;
        } else if (type === 'losses') {
          return game.winner && game.winner !== userId;
        }
        return true;
      });
    }
    
    filtered = filtered.filter(game => {
      const gameDate = new Date(game.createdAt || game.date);
      return gameDate >= from && gameDate <= to;
    });
    
    displayHistory(filtered);
  }

  filterBtn.addEventListener('click', filterHistory);

  loadHistory();
});
