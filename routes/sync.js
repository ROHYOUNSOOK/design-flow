const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const sheets = require('../lib/sheets');
const { requireRole, requireLogin } = require('../middleware/auth');

// 시트 → 보드 동기화 (Pull) - 증분 동기화 지원
router.post('/pull', requireRole('관리자'), async (req, res) => {
  try {
    const { year, month, part } = req.body;

    if (!part || !['국내', '해외'].includes(part)) {
      return res.status(400).json({ error: '파트(국내/해외)를 선택해주세요.' });
    }

    const csvRows = await sheets.fetchSheetCSV(part);
    let sheetTasks = sheets.mapSheetRowsToTasks(csvRows, part);

    // year/month 필터링
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      sheetTasks = sheetTasks.filter(t => {
        if (!t.requestDate) return false;
        const d = new Date(t.requestDate);
        return d.getFullYear() === y && (d.getMonth() + 1) === m;
      });
    }

    // 증분 동기화: 첫 동기화면 전체, 이후엔 마지막 행 기준 위로 400행만
    const maxSheetRow = await store.getMaxSheetRow(part);
    if (maxSheetRow !== null) {
      const cutoff = maxSheetRow - 400;
      sheetTasks = sheetTasks.filter(t => t.sheetRow > cutoff);
    }

    let created = 0;
    let updated = 0;

    const users = await store.getUsers();
    const userByName = {};
    for (const u of users) {
      userByName[u.name] = u;
    }

    for (const st of sheetTasks) {
      const existing = await store.getTaskBySheetRow(st.sheetRow, part);

      let assigneeId = null;
      let assigneeName = st.assigneeName;
      if (assigneeName && userByName[assigneeName]) {
        assigneeId = userByName[assigneeName].id;
      }

      if (existing) {
        await store.updateTask(existing.id, {
          title: st.title,
          description: st.description,
          status: st.status,
          assigneeId,
          assigneeName,
          dueDate: st.dueDate,
          requestDate: st.requestDate,
          part,
        });
        updated++;
      } else {
        await store.createTask({
          title: st.title,
          description: st.description,
          status: st.status,
          assigneeId,
          assigneeName,
          priority: st.priority,
          dueDate: st.dueDate,
          sheetRow: st.sheetRow,
          requestDate: st.requestDate,
          part,
        });
        created++;
      }
    }

    const partLabel = part === '국내' ? '국내파트' : '해외파트';
    const syncType = maxSheetRow !== null ? '증분' : '전체';
    res.json({
      ok: true,
      message: `${partLabel} ${syncType} 동기화 완료: ${created}개 생성, ${updated}개 업데이트`,
      created,
      updated,
    });
  } catch (err) {
    console.error('Sync pull error:', err);
    res.status(500).json({ error: '시트 동기화에 실패했습니다: ' + err.message });
  }
});

// 보드 → 시트 동기화 (Push)
router.post('/push', requireRole('관리자'), async (req, res) => {
  try {
    const { year, month, part } = req.body;

    if (!part || !['국내', '해외'].includes(part)) {
      return res.status(400).json({ error: '파트(국내/해외)를 선택해주세요.' });
    }

    let tasks;
    if (year && month) {
      tasks = await store.getTasksByMonth(parseInt(year), parseInt(month));
    } else {
      tasks = await store.getTasks();
    }

    const sheetTasks = tasks.filter(t => t.sheetRow && t.part === part);

    let pushed = 0;
    let errors = 0;

    for (const task of sheetTasks) {
      try {
        await sheets.pushToSheet(task.sheetRow, part, {
          designerName: task.assigneeName || '',
          completed: task.status === '완료',
        });
        pushed++;
      } catch (err) {
        console.error(`Push error for row ${task.sheetRow}:`, err.message);
        errors++;
      }
    }

    const partLabel = part === '국내' ? '국내파트' : '해외파트';
    res.json({
      ok: true,
      message: `${partLabel} 시트 업데이트 완료: ${pushed}개 반영, ${errors}개 실패`,
      pushed,
      errors,
    });
  } catch (err) {
    console.error('Sync push error:', err);
    res.status(500).json({ error: '시트 업데이트에 실패했습니다: ' + err.message });
  }
});

// 월별 태스크 조회
router.get('/tasks', requireLogin, async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year, month 파라미터가 필요합니다.' });
    }
    const tasks = await store.getTasksByMonth(parseInt(year), parseInt(month));
    res.json(tasks);
  } catch (err) {
    console.error('Get monthly tasks error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
