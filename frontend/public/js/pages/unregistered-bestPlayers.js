document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.querySelector('tbody');
  const prevBtn = document.querySelector('.table-pager-btn:first-child');
  const nextBtn = document.querySelector('.table-pager-btn:last-child');
  const pageInfo = document.querySelector('.table-pager-info');
  const pageSizeSelect = document.querySelector('.table-pager-size-select');

  let currentPage = 1;
  let totalPages = 1;
  let pageSize = 10;
  let topPlayers = [];

  async function loadTopPlayers() {
    try {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading top players...</td></tr>';
      
      console.log('[UNREGISTERED-BEST-PLAYERS] Fetching top players...');
      
      const response = await fetch('http://localhost:3000/api/games/top-players?limit=5');
      const data = await response.json();
      
      console.log('[UNREGISTERED-BEST-PLAYERS] Top players response:', data);
      
      if (data.success && data.topPlayers) {
        topPlayers = data.topPlayers;
      } else {
        topPlayers = [];
      }
      
      console.log('[UNREGISTERED-BEST-PLAYERS] Top players data:', topPlayers);
      totalPages = Math.ceil(topPlayers.length / pageSize);
      displayTopPlayers();
    } catch (error) {
      console.error('[UNREGISTERED-BEST-PLAYERS] Failed to load top players:', error);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ff4444;">Failed to load top players</td></tr>';
    }
  }

  function displayTopPlayers() {
    if (!topPlayers || topPlayers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No players yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = topPlayers.slice(start, end);
    
    pageData.forEach((player, index) => {
      const row = document.createElement('tr');
      const position = start + index + 1;
      
      const wins = player.stats?.gamesWon || 0;
      const totalGames = player.stats?.gamesPlayed || 0;
      const losses = totalGames - wins;
      const winRate = player.stats?.winRate || 0;
      
      row.innerHTML = '<td>' + position + '</td>' +
        '<td>' + player.username + '</td>' +
        '<td>' + wins + '</td>' +
        '<td>' + losses + '</td>' +
        '<td>' + winRate + '%</td>';
      
      tbody.appendChild(row);
    });
    
    pageInfo.innerHTML = 'Page <strong>' + currentPage + '</strong> of <strong>' + totalPages + '</strong>';
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayTopPlayers();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayTopPlayers();
    }
  });

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      pageSize = parseInt(e.target.value);
      currentPage = 1;
      totalPages = Math.ceil(topPlayers.length / pageSize);
      displayTopPlayers();
    });
  }

  loadTopPlayers();
});
