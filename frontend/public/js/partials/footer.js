// Footer HTML fragment to append at the end of the page
var footer =
  `</div> <!-- Cierre de .app -->
</body>
</html>`;


// Append footer after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('.app') || document.body;
  app.insertAdjacentHTML('beforeend', footer);
});
