function initMemberTask() {
  const btn = document.getElementById('memberTaskBtn');
  const modal = document.getElementById('memberTaskModal');
  const closeBtn = document.getElementById('memberTaskModalClose');

  if (!btn || !modal) return;

  btn.addEventListener('click', () => {
    renderMemberTaskTable();
    modal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

function renderMemberTaskTable() {
  const content = document.getElementById('memberTaskContent');
  const tasks = window.allTasks || [];

  // 팀원별 집계
  const memberMap = {};
  for (const t of tasks) {
    const name = t.assigneeName || '미배정';
    if (!memberMap[name]) {
      memberMap[name] = { inProgress: 0, completed: 0 };
    }
    if (t.status === '진행중') memberMap[name].inProgress++;
    else if (t.status === '완료') memberMap[name].completed++;
  }

  const names = Object.keys(memberMap).sort((a, b) => {
    if (a === '미배정') return 1;
    if (b === '미배정') return -1;
    return a.localeCompare(b, 'ko');
  });

  if (names.length === 0) {
    content.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">조회된 업무가 없습니다.</p>';
    return;
  }

  let html = '<table class="member-task-table">';
  html += '<thead><tr><th>팀원</th><th>진행중</th><th>완료</th><th>합계</th></tr></thead>';
  html += '<tbody>';

  let totalProgress = 0;
  let totalComplete = 0;

  for (const name of names) {
    const m = memberMap[name];
    const total = m.inProgress + m.completed;
    totalProgress += m.inProgress;
    totalComplete += m.completed;
    html += `<tr>
      <td class="member-name">${escapeHtml(name)}</td>
      <td><span class="badge badge-progress">${m.inProgress}</span></td>
      <td><span class="badge badge-complete">${m.completed}</span></td>
      <td><strong>${total}</strong></td>
    </tr>`;
  }

  html += `<tr class="member-total-row">
    <td><strong>전체</strong></td>
    <td><span class="badge badge-progress">${totalProgress}</span></td>
    <td><span class="badge badge-complete">${totalComplete}</span></td>
    <td><strong>${totalProgress + totalComplete}</strong></td>
  </tr>`;

  html += '</tbody></table>';
  content.innerHTML = html;
}
