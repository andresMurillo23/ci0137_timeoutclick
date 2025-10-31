(function() {
  var href = "/css/main.css";
  var found = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some(link => link.href.includes(href));
  if (!found) {
    var styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = href;
    document.head.appendChild(styleLink);
  }
})();

var navbar = `
<!-- Encabezado común -->
<header class="topbar" aria-label="Barra superior">
  <a class="brand" role="banner" aria-label="Ir al inicio"
     href="/pages/homeLogged.html">
    <span>TIMEOUT CLICK</span>
  </a>
  <div class="context" id="page-context" aria-live="polite"></div>
  <button class="btn logout" type="button" aria-label="Cerrar sesión"
    onclick="window.location.href='/pages/home.html'">Log out</button>
</header>

<!-- Pestañas comunes -->
<nav class="tabs" aria-label="Navegación principal">
  <a class="tab" data-section="start"    href="/pages/homeLogged.html">start game</a>
  <a class="tab" data-section="rankings" href="/pages/ranking.html">rankings</a>
  <a class="tab" data-section="history"  href="/pages/history.html">history</a>
  <a class="tab" data-section="friends"  href="/pages/friends.html">friends</a>
  <a class="tab" data-section="profile"  href="/pages/profile.html">profile</a>
</nav>`;
document.write(navbar);