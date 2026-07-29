// 되돌리기 (Undo) 시스템
const UndoManager = {
  _last: null,
  _timer: null,

  // 작업 전 상태 저장
  save(taskId, label) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    this._last = {
      taskId,
      label,
      snapshot: { ...task },
    };
  },

  // 되돌리기 토스트 표시
  show(label) {
    if (!this._last) return;
    clearTimeout(this._timer);

    let toast = document.getElementById('undoToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'undoToast';
      toast.className = 'undo-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span class="undo-label">${escapeHtml(label)}</span>
      <button class="undo-btn" id="undoBtn">되돌리기</button>
      <button class="undo-close" id="undoCloseBtn">&times;</button>
    `;
    toast.classList.add('show');

    document.getElementById('undoBtn').addEventListener('click', () => this.execute());
    document.getElementById('undoCloseBtn').addEventListener('click', () => this.dismiss());

    this._timer = setTimeout(() => this.dismiss(), 5000);
  },

  // 되돌리기 실행
  async execute() {
    if (!this._last) return;
    const { taskId, snapshot } = this._last;

    try {
      if (snapshot._deleted) {
        // 삭제된 태스크 복원
        await API.createTask({
          title: snapshot.title,
          description: snapshot.description,
          assigneeId: snapshot.assigneeId,
          assigneeName: snapshot.assigneeName,
          priority: snapshot.priority,
          dueDate: snapshot.dueDate,
          status: snapshot.status,
          part: snapshot.part,
        });
      } else {
        await API.updateTask(taskId, {
          status: snapshot.status,
          progress: snapshot.progress,
          assigneeId: snapshot.assigneeId,
          assigneeName: snapshot.assigneeName,
        });
      }
      await reloadCurrentBoard();
    } catch (err) {
      alert('되돌리기 실패: ' + err.message);
    }

    this.dismiss();
  },

  dismiss() {
    clearTimeout(this._timer);
    this._last = null;
    const toast = document.getElementById('undoToast');
    if (toast) toast.classList.remove('show');
  },
};

async function reloadCurrentBoard() {
  const f = window.currentFilter;
  if (f && f.year && f.month) {
    await loadFilteredBoard(f.year, f.month);
  } else {
    await loadBoard();
  }
}

window.UndoManager = UndoManager;
window.reloadCurrentBoard = reloadCurrentBoard;
