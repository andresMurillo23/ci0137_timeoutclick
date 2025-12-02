document.addEventListener('DOMContentLoaded', async () => {
  if (!window.auth.requireAuth()) return;

  // DOM elements
  const filterBtn = document.querySelector('.btn--filter');
  const filterType = document.getElementById('filter-type');
  const fromDate = document.getElementById('from-date');
  const toDate = document.getElementById('to-date');
  const tbody = document.querySelector('tbody');
  const pageSizeSelect = document.querySelector('.table-pager-size-select');
  const prevBtn = document.querySelector('.table-pager-btn:first-child');
  const nextBtn = document.querySelector('.table-pager-btn:last-child');
  const pagerInfo = document.querySelector('.table-pager-info');

  let allRounds = [];
  let filteredRounds = [];
  let currentPage = 1;
  let pageSize = 10;

  // Set default dates
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);
  
  fromDate.value = sixMonthsAgo.toISOString().split('T')[0];
  toDate.value = today.toISOString().split('T')[0];

  /**
   * Load game history from backend
   */
  async function loadHistory() {
    try {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading history...</td></tr>';
      
      const response = await window.api.get('/games/history?limit=1000');
      const games = response.games || [];
      
      // Extract all rounds from all games
      allRounds = [];
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      
      games.forEach(game => {
        // Check if game has rounds array
        if (game.rounds && game.rounds.length > 0) {
          game.rounds.forEach(round => {
            const isPlayer1 = game.player1._id === currentUser.id || game.player1._id === currentUser._id;
            const opponent = isPlayer1 ? game.player2 : game.player1;
            const myTime = isPlayer1 ? round.player1Time : round.player2Time;
            const opponentTime = isPlayer1 ? round.player2Time : round.player1Time;
            
            let winner = '-';
            if (round.winner) {
              const winnerId = round.winner._id || round.winner;
              const currentUserId = currentUser.id || currentUser._id;
              winner = winnerId.toString() === currentUserId.toString() ? 'You' : opponent.username;
            }
            
            allRounds.push({
              date: round.completedAt || round.startedAt || game.createdAt,
              opponent: opponent.username,
              opponentTime: opponentTime ? (opponentTime / 1000).toFixed(2) : 'N/A',
              myTime: myTime ? (myTime / 1000).toFixed(2) : 'N/A',
              goalTime: (round.goalTime / 1000).toFixed(1),
              winner: winner,
              isWin: winner === 'You'
            });
          });
        }
      });
      
      // Sort by date descending
      allRounds.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      applyFilters();
    } catch (error) {
      console.error('Failed to load history:', error);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ff4444;">Failed to load history</td></tr>';
    }
  }

  /**
   * Apply filters to rounds
   */
  function applyFilters() {
    const from = new Date(fromDate.value);
    const to = new Date(toDate.value);
    to.setHours(23, 59, 59, 999); // Include entire day
    
    const typeFilter = filterType.value;
    
    filteredRounds = allRounds.filter(round => {
      const roundDate = new Date(round.date);
      
      // Date filter
      if (roundDate < from || roundDate > to) {
        return false;
      }
      
      // Type filter
      if (typeFilter === 'wins' && !round.isWin) {
        return false;
      }
      if (typeFilter === 'losses' && round.isWin) {
        return false;
      }
      
      return true;
    });
    
    currentPage = 1;
    displayCurrentPage();
  }

  /**
   * Display current page of rounds
   */
  function displayCurrentPage() {
    if (filteredRounds.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No rounds found</td></tr>';
      updatePagination();
      return;
    }

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageRounds = filteredRounds.slice(startIdx, endIdx);

    tbody.innerHTML = '';
    
    pageRounds.forEach(round => {
      const row = document.createElement('tr');
      
      const date = new Date(round.date);
      const dateStr = date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      });
      
      row.innerHTML = `
        <td>${dateStr}</td>
        <td>${round.opponent}</td>
        <td>${round.opponentTime}s</td>
        <td>${round.myTime}s</td>
        <td>${round.goalTime}s</td>
        <td><strong>${round.winner}</strong></td>
      `;
      
      tbody.appendChild(row);
    });
    
    updatePagination();
  }

  /**
   * Update pagination controls
   */
  function updatePagination() {
    const totalPages = Math.ceil(filteredRounds.length / pageSize);
    
    pagerInfo.innerHTML = `Page <strong>${currentPage}</strong> of <strong>${totalPages || 1}</strong>`;
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  }

  // Event listeners
  filterBtn.addEventListener('click', applyFilters);
  
  pageSizeSelect.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    displayCurrentPage();
  });
  
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayCurrentPage();
    }
  });
  
  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredRounds.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      displayCurrentPage();
    }
  });

  // Initial load
  loadHistory();
});
