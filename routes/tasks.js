const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { requireLogin, requireRole, requireApproved } = require('../middleware/auth');

// 업무 목록 조회 (팀원은 본인 업무만)
router.get('/', requireLogin, requireApproved, async (req, res) => {
  try {
    let tasks = await store.getTasks();
    if (req.user.role === '팀원') {
      tasks = tasks.filter(t =>
        t.assigneeId === req.user.id || t.assigneeName === req.user.name
      );
    }
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 업무 생성 (관리자만)
router.post('/', requireRole('관리자'), async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate, part } = req.body;
    if (!title) {
      return res.status(400).json({ error: '제목은 필수입니다.' });
    }

    let assigneeName = null;
    if (assigneeId) {
      const assignee = await store.getUserById(assigneeId);
      assigneeName = assignee ? assignee.name : null;
    }

    const task = await store.createTask({
      title,
      description,
      assigneeId,
      assigneeName,
      priority,
      dueDate,
      createdBy: req.user.id,
      part: part || '국내',
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 업무 수정 (관리자만)
router.put('/:id', requireRole('관리자'), async (req, res) => {
  try {
    const task = await store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    }

    const { title, description, assigneeId, priority, dueDate, part } = req.body;
    const fields = {};

    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (part !== undefined) fields.part = part;
    if (assigneeId !== undefined) {
      fields.assigneeId = assigneeId;
      if (assigneeId) {
        const assignee = await store.getUserById(assigneeId);
        fields.assigneeName = assignee ? assignee.name : null;
      } else {
        fields.assigneeName = null;
      }
    }
    if (priority !== undefined) fields.priority = priority;
    if (dueDate !== undefined) fields.dueDate = dueDate;

    const updated = await store.updateTask(req.params.id, fields);
    res.json(updated);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 업무 삭제 (관리자만)
router.delete('/:id', requireRole('관리자'), async (req, res) => {
  try {
    const deleted = await store.deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 업무 시작 (관리자 또는 팀원 - 본인 업무만)
router.patch('/:id/start', requireRole('관리자', '팀원'), async (req, res) => {
  try {
    const task = await store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    }
    if (req.user.role !== '관리자' && task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: '본인의 업무만 시작할 수 있습니다.' });
    }
    if (task.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 업무만 시작할 수 있습니다.' });
    }

    const updated = await store.updateTask(req.params.id, {
      status: '진행중',
      progress: task.progress || 10,
    });
    res.json(updated);
  } catch (err) {
    console.error('Start task error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 업무 완료 (관리자 또는 팀원 - 본인 업무만) → 팀장/부팀장에게 알림
router.patch('/:id/complete', requireRole('관리자', '팀원'), async (req, res) => {
  try {
    const task = await store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    }
    if (req.user.role !== '관리자' && task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: '본인의 업무만 완료할 수 있습니다.' });
    }
    if (task.status !== '진행중') {
      return res.status(400).json({ error: '진행중인 업무만 완료할 수 있습니다.' });
    }

    const updated = await store.updateTask(req.params.id, {
      status: '완료',
      progress: 100,
    });

    // 팀장·부팀장에게 알림 생성
    const leaders = await store.getLeaders();
    for (const leader of leaders) {
      await store.createNotification({
        type: 'complete',
        recipientId: leader.id,
        taskId: task.id,
        message: `${req.user.name}님이 "${task.title}" 업무를 완료했습니다.`,
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('Complete task error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 진행도 업데이트 (관리자 또는 팀원 - 본인 업무만)
router.patch('/:id/progress', requireRole('관리자', '팀원'), async (req, res) => {
  try {
    const task = await store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    }
    if (req.user.role !== '관리자' && task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: '본인의 업무만 수정할 수 있습니다.' });
    }

    const { progress } = req.body;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ error: '진행도는 0~100 사이 숫자여야 합니다.' });
    }

    const updated = await store.updateTask(req.params.id, { progress });
    res.json(updated);
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 드래그앤드롭 상태 변경
router.patch('/:id/status', requireLogin, requireApproved, async (req, res) => {
  try {
    const user = req.user;
    const task = await store.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '업무를 찾을 수 없습니다.' });
    }

    // 관리자는 모든 카드 이동 가능, 팀원은 본인 카드만
    if (user.role === '팀원' && task.assigneeId !== user.id) {
      return res.status(403).json({ error: '본인의 업무만 이동할 수 있습니다.' });
    }
    if (user.role !== '관리자' && user.role !== '팀원') {
      return res.status(403).json({ error: '업무 상태를 변경할 권한이 없습니다.' });
    }

    const { status } = req.body;
    if (!['대기', '진행중', '완료'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    }

    const oldStatus = task.status;
    const fields = { status };

    // 상태별 진행도 자동 조정
    if (status === '대기') fields.progress = 0;
    if (status === '진행중' && task.progress === 0) fields.progress = 10;
    if (status === '완료') fields.progress = 100;

    const updated = await store.updateTask(req.params.id, fields);

    // 완료로 이동 시 알림 생성
    if (status === '완료' && oldStatus !== '완료') {
      const leaders = await store.getLeaders();
      for (const leader of leaders) {
        await store.createNotification({
          type: 'complete',
          recipientId: leader.id,
          taskId: task.id,
          message: `${user.name}님이 "${task.title}" 업무를 완료 처리했습니다.`,
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
