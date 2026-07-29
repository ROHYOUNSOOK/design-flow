// 시트 동기화 API
const SyncAPI = {
  pull(year, month, part) { return API.request('POST', '/sync/pull', { year, month, part }); },
  push(year, month, part) { return API.request('POST', '/sync/push', { year, month, part }); },
  getMonthlyTasks(year, month) { return API.request('GET', '/sync/tasks?year=' + year + '&month=' + month); },
};

// 현재 필터 상태
window.currentFilter = { year: null, month: null };

function getSelectedPart() {
  const el = document.getElementById('partSelect');
  return el ? el.value : '국내';
}

function initFilter() {
  const yearSelect = document.getElementById('filterYear');
  const monthSelect = document.getElementById('filterMonth');
  const filterBtn = document.getElementById('filterBtn');
  const resetBtn = document.getElementById('filterResetBtn');

  if (!yearSelect || !monthSelect) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '년';
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m + '월';
    if (m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }

  filterBtn.addEventListener('click', async () => {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    window.currentFilter = { year, month };
    await loadFilteredBoard(year, month);
  });

  resetBtn.addEventListener('click', async () => {
    window.currentFilter = { year: null, month: null };
    await loadBoard();
  });
}

async function loadFilteredBoard(year, month) {
  try {
    const [tasks, users] = await Promise.all([
      SyncAPI.getMonthlyTasks(year, month),
      API.getUsers()
    ]);
    allTasks = tasks;
    allUsers = users;
    renderBoard(tasks, users);
  } catch (err) {
    alert('조회 실패: ' + err.message);
  }
}

function getSelectedFilter() {
  const yearSelect = document.getElementById('filterYear');
  const monthSelect = document.getElementById('filterMonth');
  if (!yearSelect || !monthSelect) return { year: null, month: null };
  return {
    year: parseInt(yearSelect.value),
    month: parseInt(monthSelect.value),
  };
}

function initSync() {
  const pullBtn = document.getElementById('syncPullBtn');
  const pushBtn = document.getElementById('syncPushBtn');

  if (!pullBtn || !pushBtn) return;

  pullBtn.addEventListener('click', async () => {
    if (pullBtn.disabled) return;
    const { year, month } = getSelectedFilter();
    const part = getSelectedPart();
    const partLabel = part === '국내' ? '국내파트' : '해외파트';

    pullBtn.disabled = true;
    pullBtn.textContent = '동기화 중...';
    try {
      const result = await SyncAPI.pull(year, month, part);
      alert(result.message);
      if (year && month) {
        window.currentFilter = { year, month };
        await loadFilteredBoard(year, month);
      } else {
        await loadBoard();
      }
    } catch (err) {
      alert('동기화 실패: ' + err.message);
    } finally {
      pullBtn.disabled = false;
      pullBtn.textContent = '시트 가져오기';
    }
  });

  pushBtn.addEventListener('click', async () => {
    if (pushBtn.disabled) return;
    const { year, month } = getSelectedFilter();
    const part = getSelectedPart();
    const partLabel = part === '국내' ? '국내파트' : '해외파트';

    const msg = year && month
      ? `${partLabel} ${year}년 ${month}월 데이터를 시트에 반영합니다. 계속하시겠습니까?`
      : `${partLabel} 전체 데이터를 시트에 반영합니다. 계속하시겠습니까?`;
    if (!confirm(msg)) return;

    pushBtn.disabled = true;
    pushBtn.textContent = '내보내기 중...';
    try {
      const result = await SyncAPI.push(year, month, part);
      alert(result.message);
    } catch (err) {
      alert('내보내기 실패: ' + err.message);
    } finally {
      pushBtn.disabled = false;
      pushBtn.textContent = '시트 내보내기';
    }
  });
}
