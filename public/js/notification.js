const bellBtn = document.getElementById('bellBtn');
const notifBadge = document.getElementById('notifBadge');
const notifDropdown = document.getElementById('notifDropdown');
const notifList = document.getElementById('notifList');
const readAllBtn = document.getElementById('readAllBtn');

let notifOpen = false;

bellBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  notifOpen = !notifOpen;
  notifDropdown.classList.toggle('active', notifOpen);
  if (notifOpen) loadNotifications();
});

document.addEventListener('click', (e) => {
  if (!notifDropdown.contains(e.target) && e.target !== bellBtn) {
    notifOpen = false;
    notifDropdown.classList.remove('active');
  }
});

readAllBtn.addEventListener('click', async () => {
  try {
    await API.markAllRead();
    loadNotifications();
    updateBadge(0);
  } catch {}
});

async function loadNotifications() {
  try {
    const notifications = await API.getNotifications();
    renderNotifications(notifications);
    const unread = notifications.filter(n => !n.read).length;
    updateBadge(unread);
  } catch {}
}

function renderNotifications(notifications) {
  if (notifications.length === 0) {
    notifList.innerHTML = '<div class="notification-empty">알림이 없습니다</div>';
    return;
  }

  notifList.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notification-message">${escapeHtml(n.message)}</div>
      <div class="notification-time">${timeAgo(n.createdAt)}</div>
    </div>
  `).join('');

  notifList.querySelectorAll('.notification-item.unread').forEach(item => {
    item.addEventListener('click', async () => {
      try {
        await API.markRead(item.dataset.id);
        item.classList.remove('unread');
        const remaining = notifList.querySelectorAll('.unread').length;
        updateBadge(remaining);
      } catch {}
    });
  });
}

function updateBadge(count) {
  if (count > 0) {
    notifBadge.textContent = count > 99 ? '99+' : count;
    notifBadge.classList.remove('hidden');
  } else {
    notifBadge.classList.add('hidden');
  }
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '방금 전';
  if (diff < 3600) return Math.floor(diff / 60) + '분 전';
  if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
  return Math.floor(diff / 86400) + '일 전';
}

// 폴링 시작
let pollInterval;
function startPolling() {
  loadNotifications();
  pollInterval = setInterval(loadNotifications, 10000);
}

function stopPolling() {
  if (pollInterval) clearInterval(pollInterval);
}
