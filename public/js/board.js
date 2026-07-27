let allTasks = [];
let allUsers = [];

async function loadBoard() {
  try {
    const [tasks, users] = await Promise.all([
      API.getTasks(),
      API.getUsers()
    ]);
    allTasks = tasks;
    allUsers = users;
    renderBoard(tasks, users);
  } catch (e) {
    if (e.message.includes('로그인')) {
      location.href = '/';
    }
  }
}

function renderBoard(tasks, users) {
  const currentUser = window.currentUser;
  const statuses = ['대기', '진행중', '완료'];

  statuses.forEach(status => {
    const list = document.querySelector(`.card-list[data-status="${status}"]`);
    list.innerHTML = '';

    const filtered = tasks.filter(t => t.status === status);
    document.getElementById('count-' + status).textContent = filtered.length;

    filtered.forEach(task => {
      const cardEl = createCardElement(task, currentUser, users);
      list.appendChild(cardEl);
    });
  });

  initDragDrop();
}

window.loadBoard = loadBoard;
