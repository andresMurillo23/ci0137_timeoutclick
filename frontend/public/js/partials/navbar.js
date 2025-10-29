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
    <button class="btn logout" type="button" aria-label="Cerrar sesión">Log out</button>
</header>

<!-- Pestañas comunes -->
<nav class="tabs" aria-label="Navegación principal">
    <a class="tab" href="/pages/homeLogged.html">start game</a>
    <a class="tab" href="#">rankings</a>
    <a class="tab" href="#">history</a>
    <a href="/pages/addFriend.html" class="tab" href="#">friends</a>
    <a class="tab is-active" href="#" aria-current="page">profile</a>
</nav>`;
document.write(navbar);
