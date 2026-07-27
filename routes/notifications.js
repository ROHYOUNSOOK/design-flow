const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { requireLogin } = require('../middleware/auth');

// 내 알림 조회
router.get('/', requireLogin, async (req, res) => {
  try {
    const notifications = await store.getNotificationsByRecipient(req.user.id);
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 모든 알림 읽음 처리 (must come before /:id routes)
router.patch('/read-all', requireLogin, async (req, res) => {
  try {
    await store.markAllNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Read all notifications error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 알림 읽음 처리
router.patch('/:id/read', requireLogin, async (req, res) => {
  try {
    const notif = await store.markNotificationRead(req.params.id);
    if (!notif) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }
    if (notif.recipientId !== req.user.id) {
      return res.status(403).json({ error: '본인의 알림만 읽음 처리할 수 있습니다.' });
    }
    res.json(notif);
  } catch (err) {
    console.error('Read notification error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
