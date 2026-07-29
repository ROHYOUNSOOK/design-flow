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

      const PAGE_SIZE = 5;
      let visibleCount = PAGE_SIZE;
      filtered.forEach((task, idx) => {
        const card = createCardElement(task, currentUser, users);
        if (idx >= PAGE_SIZE) card.classList.add('card-hidden');
        cardList.appendChild(card);
      });

      col.appendChild(cardList);

      if (filtered.length > PAGE_SIZE) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn-show-more';
        const remaining = filtered.length - PAGE_SIZE;
        moreBtn.textContent = `더보기 (${remaining}건)`;
        moreBtn.addEventListener('click', () => {
          const hiddenCards = cardList.querySelectorAll('.card-hidden');
          const nextBatch = Math.min(PAGE_SIZE, hiddenCards.length);
          for (let i = 0; i < nextBatch; i++) {
            hiddenCards[i].classList.remove('card-hidden');
          }
          visibleCount += nextBatch;
          const newRemaining = filtered.length - visibleCount;
          if (newRemaining <= 0) {
            moreBtn.remove();
          } else {
            moreBtn.textContent = `더보기 (${newRemaining}건)`;
          }
        });
        col.appendChild(moreBtn);
      }

      columnsWrap.appendChild(col);
    });

    partGroup.appendChild(columnsWrap);
    board.appendChild(partGroup);
  });

  initDragDrop();
}

window.loadBoard = loadBoard;
