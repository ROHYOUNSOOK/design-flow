(async function() {
  // 이미 로그인되어 있으면 보드로 이동
  try {
    await API.me();
    location.href = '/board.html';
    return;
  } catch {}

  const userList = document.getElementById('userList');
  const users = await API.getUsers();

  users.forEach(user => {
    const btn = document.createElement('button');
    btn.className = 'user-btn';
    btn.innerHTML = `
      <div class="user-avatar" style="background:${user.avatar}">${user.name[0]}</div>
      <div class="user-info">
        <span class="name">${user.name}</span>
        <span class="role">${user.role}</span>
      </div>
    `;
    btn.addEventListener('click', async () => {
      try {
        await API.login(user.id);
        location.href = '/board.html';
      } catch (e) {
        alert(e.message);
      }
    });
    userList.appendChild(btn);
  });
})();
