window.currentUser = null;

(async function init() {
  try {
    const { user } = await API.me();
    window.currentUser = user;
  } catch {
    location.href = '/';
    return;
  }

  const user = window.currentUser;

  // 헤더 유저 정보
  document.getElementById('headerAvatar').style.background = user.avatar;
  document.getElementById('headerAvatar').textContent = user.name[0];
  document.getElementById('headerName').textContent = user.name;
  document.getElementById('headerRole').textContent = user.role;

  // 필터 초기화 (모든 유저 사용 가능)
  initFilter();

  // 관리자: 새 업무 + 팀원 관리 + 동기화 버튼 표시
  if (user.role === '관리자') {
    document.getElementById('addTaskBtn').style.display = '';
    document.getElementById('manageUsersBtn').style.display = '';
    document.getElementById('partSelect').style.display = '';
    document.getElementById('syncPullBtn').style.display = '';
    document.getElementById('syncPushBtn').style.display = '';
    initSync();
  }

  // 로그아웃
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await API.logout();
    location.href = '/';
  });

  // 보드 로드
  await loadBoard();

  // 알림 폴링 시작 (팀장, 부팀장만)
  if (user.role === '파트장' || user.role === '부팀장') {
    startPolling();
  } else {
    // 다른 역할은 배지 숨김
    document.getElementById('bellBtn').style.display = 'none';
  }
})();
