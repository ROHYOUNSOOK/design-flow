function initDragDrop() {
  const cards = document.querySelectorAll('.card[draggable="true"]');
  const columns = document.querySelectorAll('.column');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      window._draggingPart = card.closest('.column').dataset.part;
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      columns.forEach(col => col.classList.remove('drag-over'));
      window._draggingPart = null;
    });
  });

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      if (window._draggingPart && col.dataset.part !== window._draggingPart) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
      }
    });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain');
      const newStatus = col.dataset.status;
      const task = allTasks.find(t => t.id === taskId);
      if (task && task.status === newStatus) return;

      UndoManager.save(taskId, `"${task ? task.title : ''}" 상태 변경`);

      try {
        await API.updateTaskStatus(taskId, newStatus);
        await reloadCurrentBoard();
        UndoManager.show(`${task.title} → ${newStatus}`);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}
