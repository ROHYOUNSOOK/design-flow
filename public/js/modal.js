const modal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskIdInput = document.getElementById('taskId');
const titleInput = document.getElementById('taskTitleInput');
const descInput = document.getElementById('taskDescInput');
const assigneeInput = document.getElementById('taskAssigneeInput');
const dueInput = document.getElementById('taskDueInput');
const submitBtn = document.getElementById('modalSubmitBtn');

let selectedPriority = 'mid';

// 우선도 버튼
document.querySelectorAll('.priority-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.priority-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedPriority = btn.dataset.value;
  });
});

function openModal() {
  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
  resetForm();
}

function resetForm() {
  taskIdInput.value = '';
  titleInput.value = '';
  descInput.value = '';
  assigneeInput.value = '';
  dueInput.value = '';
  selectedPriority = 'mid';
  document.querySelectorAll('.priority-option').forEach(b => {
    b.classList.toggle('selected', b.dataset.value === 'mid');
  });
  modalTitle.textContent = '새 업무 만들기';
  submitBtn.textContent = '생성';
}

function populateAssignees() {
  const members = allUsers.filter(u => u.role === '팀원');
  assigneeInput.innerHTML = '<option value="">미배정</option>';
  members.forEach(m => {
    assigneeInput.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

// 새 업무 모달 열기
document.getElementById('addTaskBtn').addEventListener('click', () => {
  resetForm();
  populateAssignees();
  openModal();
});

// 수정 모달 열기
window.openEditModal = function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  populateAssignees();
  taskIdInput.value = task.id;
  titleInput.value = task.title;
  descInput.value = task.description;
  assigneeInput.value = task.assigneeId || '';
  dueInput.value = task.dueDate || '';
  selectedPriority = task.priority;

  document.querySelectorAll('.priority-option').forEach(b => {
    b.classList.toggle('selected', b.dataset.value === task.priority);
  });

  modalTitle.textContent = '업무 수정';
  submitBtn.textContent = '수정';
  openModal();
};

// 닫기
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// 제출
submitBtn.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  if (!title) {
    alert('제목을 입력해주세요.');
    return;
  }

  const data = {
    title,
    description: descInput.value.trim(),
    assigneeId: assigneeInput.value || null,
    priority: selectedPriority,
    dueDate: dueInput.value || null
  };

  try {
    if (taskIdInput.value) {
      await API.updateTask(taskIdInput.value, data);
    } else {
      await API.createTask(data);
    }
    closeModal();
    window.loadBoard();
  } catch (e) {
    alert(e.message);
  }
});
