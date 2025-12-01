document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  const tbody = document.querySelector('tbody');
  const prevBtn = document.querySelector('.table-pager-btn:first-child');
  const nextBtn = document.querySelector('.table-pager-btn:last-child');
  const pageInfo = document.querySelector('.table-pager-info');
  const pageSizeSelect = document.querySelector('.table-pager-size-select');

  let currentPage = 1;
  let totalPages = 1;
  let pageSize = 10;
  let leaderboard = [];

  async function loadLeaderboard() {
    try {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Loading leaderboard...</td></tr>';
      
      const response = await window.api.getLeaderboard();
      leaderboard = response.leaderboard || response;
      
      totalPages = Math.ceil(leaderboard.length / pageSize);
      displayLeaderboard();
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ff4444;">Failed to load leaderboard</td></tr>';
    }
  }

  function displayLeaderboard() {
    if (!leaderboard || leaderboard.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No players yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = leaderboard.slice(start, end);
    
    pageData.forEach((player, index) => {
      const row = document.createElement('tr');
      const position = start + index + 1;
      
      const wins = player.gamesWon || player.wins || 0;
      const totalGames = player.gamesPlayed || player.totalGames || 0;
      const losses = totalGames - wins;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      
      row.innerHTML = `
        <td>${position}</td>
        <td>${player.username}</td>
        <td>${wins}</td>
        <td>${losses}</td>
        <td>${winRate}%</td>
      `;
      
      tbody.appendChild(row);
    });
    
    pageInfo.innerHTML = `Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayLeaderboard();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayLeaderboard();
    }
  });

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      pageSize = parseInt(e.target.value);
      currentPage = 1;
      totalPages = Math.ceil(leaderboard.length / pageSize);
      displayLeaderboard();
    });
  }

  loadLeaderboard();
});
