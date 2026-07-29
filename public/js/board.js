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
  const board = document.getElementById('board');
  board.innerHTML = '';

  const parts = ['국내', '해외'];
  const statuses = ['대기', '진행중', '완료'];

  parts.forEach(part => {
    const partTasks = tasks.filter(t => (t.part || '국내') === part);

    const partGroup = document.createElement('div');
    partGroup.className = 'part-group';
    partGroup.dataset.part = part;

    const partHeader = document.createElement('div');
    partHeader.className = 'part-header';
    partHeader.innerHTML = `<span class="part-title">${part}파트</span><span class="part-count">${partTasks.length}</span>`;
    partGroup.appendChild(partHeader);

    const columnsWrap = document.createElement('div');
    columnsWrap.className = 'part-columns';

    statuses.forEach(status => {
      const col = document.createElement('div');
      col.className = 'column';
      col.dataset.status = status;
      col.dataset.part = part;

      const filtered = partTasks.filter(t => t.status === status);

      const header = document.createElement('div');
      header.className = 'column-header';
      header.innerHTML = `<span class="column-title"><span class="column-dot"></span>${status}</span><span class="column-count">${filtered.length}</span>`;
      col.appendChild(header);

      const cardList = document.createElement('div');
      cardList.className = 'card-list';
      cardList.dataset.status = status;
      cardList.dataset.part = part;

      filtered.forEach(task => {
        cardList.appendChild(createCardElement(task, currentUser, users));
      });

      col.appendChild(cardList);
      columnsWrap.appendChild(col);
    });

    partGroup.appendChild(columnsWrap);
    board.appendChild(partGroup);
  });

  initDragDrop();
}

window.loadBoard = loadBoard;
