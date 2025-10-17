var templateSuperior = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/css/otherProfile-style.css">
  
</head>
<body>
  <div class="app">
  <!-- Encabezado común -->
    <header class="topbar" aria-label="Barra superior">
        <div class="brand" role="banner">
        <span class="chip" aria-hidden="true"></span>
        <span>TIMEOUT CLICK</span>
        </div>
        <div class="context" id="page-context" aria-live="polite"></div>
        <button class="btn logout" type="button" aria-label="Cerrar sesión">Log out</button>
    </header>

<!-- Pestañas comunes -->
<nav class="tabs" aria-label="Navegación principal">
    <a class="tab" href="#">start game</a>
    <a class="tab" href="#">rankings</a>
    <a class="tab" href="#">history</a>
    <a class="tab" href="#">friends</a>
    <a class="tab is-active" href="#" aria-current="page">profile</a>
</nav>`;

document.write(templateSuperior);