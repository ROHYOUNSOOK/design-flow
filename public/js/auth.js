(async function() {
  try {
    await API.me();
    location.href = '/board.html';
    return;
  } catch {}

  const form = document.getElementById('loginForm');
  const input = document.getElementById('emailInput');
  const errorEl = document.getElementById('loginError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    const email = input.value.trim();
    if (!email) return;

    try {
      await API.login(email);
      location.href = '/board.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
})();
