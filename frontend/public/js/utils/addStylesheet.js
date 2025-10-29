/**
 * Agrega una hoja de estilos CSS al documento.
 * @param {string} href - Ruta del archivo CSS.
 * @returns {HTMLLinkElement} El elemento <link> creado.
 */
function addStylesheet(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  return link;
}

// Ejemplo de uso:

// <script src="/js/utils/addStylesheet.js"></script>

// <script>
//   // Cuando se desee agregar una hoja de estilo adicional:
//   addStylesheet("/css/pages/extra.css");
//   // Puede llamarla más veces si necesita más hojas
//   addStylesheet("/css/pages/otro.css");
// </script>