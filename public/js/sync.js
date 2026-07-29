// 시트 동기화 API
const SyncAPI = {
  pull(year, month) { return API.request('POST', '/sync/pull', { year, month }); },
  push(year, month) { return API.request('POST', '/sync/push', { year, month }); },
  getMonthlyTasks(year, month) { return API.request('GET', '/sync/tasks?year=' + year + '&month=' + month); },
};

// 현재 필터 상태
window.currentFilter = { year: null, month: null };

function initFilter() {
  const yearSelect = document.getElementById('filterYear');
  const monthSelect = document.getElementById('filterMonth');
  const filterBtn = document.getElementById('filterBtn');
  const resetBtn = document.getElementById('filterResetBtn');

  if (!yearSelect || !monthSelect) return;

  // 년도 옵션 (현재 년도 기준 +-2년)
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

  // 월 옵션
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m + '월';
    if (m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }

  // 조회 버튼
  filterBtn.addEventListener('click', async () => {
    const year = parseInt(yearSelect.value);
    const month = parseInt(monthSelect.value);
    window.currentFilter = { year, month };
    await loadFilteredBoard(year, month);
  });

  // 전체 보기
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
    pullBtn.disabled = true;
    pullBtn.textContent = '동기화 중...';
    try {
      const result = await SyncAPI.pull(year, month);
      alert(result.message);
      // 동기화 후 해당 월로 필터 조회
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
    const msg = year && month
      ? `${year}년 ${month}월 데이터를 시트에 반영합니다. 계속하시겠습니까?`
      : '보드의 디자이너 배정/완료 상태를 시트에 반영합니다. 계속하시겠습니까?';
    if (!confirm(msg)) return;
    pushBtn.disabled = true;
    pushBtn.textContent = '내보내기 중...';
    try {
      const result = await SyncAPI.push(year, month);
      alert(result.message);
    } catch (err) {
      alert('내보내기 실패: ' + err.message);
    } finally {
      pushBtn.disabled = false;
      pushBtn.textContent = '시트 내보내기';
    }
  });
}
