var footer =
  `</div> <!-- Cierre de .app -->
</body>
</html>`;
// document.write(footer);
document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('.app') || document.body;
  app.insertAdjacentHTML('beforeend', footer);
});