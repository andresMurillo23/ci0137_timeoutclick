// Cargar automáticamente los estilos del navbar si no están presentes
(function() {
  var href = "/css/main.css";
  var links = document.querySelectorAll('link[rel="stylesheet"]');
  var found = false;
  links.forEach(function(link) {
    if (link.href.includes(href)) found = true;
  });
  if (!found) {
    var styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = href;
    document.head.appendChild(styleLink);
  }
})();

var navbar =
`
<!-- Encabezado común -->
<header class="topbar" aria-label="Barra superior">
  <div class="brand" role="banner">
    <span>TIMEOUT CLICK</span>
  </div>
  <div class="context" id="page-context" aria-live="polite"></div>
  <button class="btn logout" type="button" aria-label="Cerrar sesión"
    onclick="window.location.href='/pages/home.html'"> Log out</button>
</header>

<!-- Pestañas comunes -->
<nav class="tabs" aria-label="Navegación principal">
  <a class="tab" href="/pages/homeLogged.html">start game</a>
  <a class="tab" href="/pages/registeredRanking.html">rankings</a>
  <a class="tab" href="/pages/history.html">history</a>
  <a class="tab" href="/pages/friends.html">friends</a>
  <a class="tab" href="/pages/profile.html">profile</a>
</nav>`;
document.write(navbar);