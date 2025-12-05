var navbar = `
<!-- Encabezado común -->
<header class="topbar" aria-label="Barra superior">
  <a class="brand" role="banner" aria-label="Ir al inicio"
     href="/pages/homeLogged.html">
    <span>TIMEOUT CLICK</span>
  </a>
  <div class="context" id="page-context" aria-live="polite"></div>
  <button class="btn logout" type="button" aria-label="Cerrar sesión" id="logoutBtn">Log out</button>
</header>

<!-- Pestañas comunes -->
<nav class="tabs" aria-label="Navegación principal">
  <a class="tab" data-section="home"    href="/pages/homeLogged.html">home</a>
  <a class="tab" data-section="rankings" href="/pages/ranking.html">rankings</a>
  <a class="tab" data-section="history"  href="/pages/history.html">history</a>
  <a class="tab" data-section="friends"  href="/pages/friends.html">friends</a>
  <a class="tab" data-section="profile"  href="/pages/profile.html">profile</a>
</nav>`;

document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('.app') || document.body;
  app.insertAdjacentHTML('afterbegin', navbar);
  
  // Add logout functionality after navbar is inserted
  setTimeout(() => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[LOGOUT] Button clicked');
        
        try {
          // Clear session storage first
          sessionStorage.clear();
          console.log('[LOGOUT] Session storage cleared');
          
          // Call logout API
          if (window.auth) {
            await window.auth.logout();
            console.log('[LOGOUT] Auth logout called');
          } else if (window.api) {
            await window.api.logout();
            console.log('[LOGOUT] API logout called');
          }
        } catch (error) {
          console.error('[LOGOUT] Error:', error);
        } finally {
          // Always redirect and clear session
          sessionStorage.clear();
          localStorage.clear();
          console.log('[LOGOUT] Redirecting to home');
          window.location.href = '/pages/home.html';
        }
      });
      console.log('[LOGOUT] Event listener attached');
    } else {
      console.error('[LOGOUT] Button not found');
    }
  }, 100);
});

