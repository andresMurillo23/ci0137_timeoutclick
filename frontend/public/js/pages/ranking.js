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
      
      console.log('[RANKING] Fetching friends ranking...');
      console.log('[RANKING] API client available?', !!window.api);
      console.log('[RANKING] getFriendsRanking method available?', typeof window.api?.getFriendsRanking);
      
      const response = await window.api.getFriendsRanking();
      console.log('[RANKING] Friends ranking response:', response);
      
      if (response.success && response.leaderboard) {
        leaderboard = response.leaderboard;
      } else {
        leaderboard = [];
      }
      
      console.log('[RANKING] Friends ranking data:', leaderboard);
      totalPages = Math.ceil(leaderboard.length / pageSize);
      displayLeaderboard();
    } catch (error) {
      console.error('[RANKING] Failed to load friends ranking:', error);
      console.error('[RANKING] Error details:', error.message, error.stack);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ff4444;">Failed to load ranking</td></tr>';
    }
  }

  function displayLeaderboard() {
    if (!leaderboard || leaderboard.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No players yet. Add friends to see them here!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = leaderboard.slice(start, end);
    
    pageData.forEach((player, index) => {
      const row = document.createElement('tr');
      const position = start + index + 1;
      
      const wins = player.stats?.gamesWon || 0;
      const totalGames = player.stats?.gamesPlayed || 0;
      const losses = totalGames - wins;
      const winRate = player.stats?.winRate || 0;
      
      row.innerHTML = '<td>' + position + '</td>' +
        '<td>' + player.username + (player.isCurrentUser ? ' (You)' : '') + '</td>' +
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
