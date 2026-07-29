function createCardElement(task, currentUser, users) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = task.id;
  card.dataset.priority = task.priority;
  card.draggable = canDrag(task, currentUser);

  const assignee = users.find(u => u.id === task.assigneeId);
  const avatarColor = assignee ? assignee.avatar : '#b2bec3';
  const avatarInitial = task.assigneeName ? task.assigneeName[0] : '?';

  // 마감일 체크
  let dueDateStr = '';
  let dueClass = '';
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDateStr = formatDate(task.dueDate);
    if (due < now && task.status !== '완료') dueClass = 'overdue';
  }

  // 진행도 바 색상
  let barClass = '';
  if (task.progress >= 100) barClass = 'done';
  else if (task.progress >= 70) barClass = '';
  else if (task.progress >= 40) barClass = '';
  else barClass = '';

  let html = '';

  // 관리자 메뉴 버튼
  if (currentUser.role === '관리자') {
    html += `<button class="card-menu-btn" data-action="menu" data-id="${task.id}">⋮</button>`;
  }

  html += `
    <div class="card-title">${escapeHtml(task.title)}</div>
    ${task.description ? `<div class="card-desc">${escapeHtml(task.description)}</div>` : ''}
    <div class="progress-bar-container">
      <div class="progress-bar ${barClass}" style="width:${task.progress}%"></div>
    </div>
    <div class="progress-text">${task.progress}%</div>
    <div class="card-footer">
      <div class="card-assignee">
        <div class="mini-avatar" style="background:${avatarColor}">${avatarInitial}</div>
        <span>${task.assigneeName || '미배정'}</span>
      </div>
      ${task.dueDate ? `<div class="card-due ${dueClass}">${dueDateStr}</div>` : ''}
    </div>
  `;

  // 팀원 액션 버튼
  if (currentUser.role === '팀원' && task.assigneeId === currentUser.id) {
    if (task.status === '대기') {
      html += `<div class="card-actions"><button class="btn-card-action btn-start" data-action="start" data-id="${task.id}">시작하기</button></div>`;
    } else if (task.status === '진행중') {
      html += `
        <div class="progress-slider-container">
          <input type="range" class="progress-slider" min="0" max="100" value="${task.progress}" data-id="${task.id}">
          <span class="progress-slider-value">${task.progress}%</span>
        </div>
        <div class="card-actions"><button class="btn-card-action btn-complete" data-action="complete" data-id="${task.id}">완료하기</button></div>
      `;
    }
  }

  // 관리자 편집/삭제 버튼
  if (currentUser.role === '관리자') {
    html += `
      <div class="card-actions">
        <button class="btn-card-action btn-edit" data-action="edit" data-id="${task.id}">수정</button>
        <button class="btn-card-action btn-delete" data-action="delete" data-id="${task.id}">삭제</button>
      </div>
    `;
  }

  card.innerHTML = html;

  // 이벤트 바인딩
  card.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    try {
      if (action === 'start') {
        await API.startTask(id);
        window.loadBoard();
      } else if (action === 'complete') {
        await API.completeTask(id);
        window.loadBoard();
      } else if (action === 'edit') {
        window.openEditModal(id);
      } else if (action === 'delete') {
        if (confirm('이 업무를 삭제하시겠습니까?')) {
          await API.deleteTask(id);
          window.loadBoard();
        }
      }
    } catch (err) {
      alert(err.message);
    }
  });

  // 진행도 슬라이더
  const slider = card.querySelector('.progress-slider');
  if (slider) {
    let debounceTimer;
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      const valueSpan = card.querySelector('.progress-slider-value');
      valueSpan.textContent = val + '%';

      const bar = card.querySelector('.progress-bar');
      bar.style.width = val + '%';
      card.querySelector('.progress-text').textContent = val + '%';

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          await API.updateProgress(slider.dataset.id, val);
        } catch (err) {
          alert(err.message);
        }
      }, 300);
    });
  }

  return card;
}

function canDrag(task, user) {
  if (user.role === '관리자') return true;
  if (user.role === '팀원' && task.assigneeId === user.id) return true;
  return false;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
