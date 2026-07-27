const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { requireRole } = require('../middleware/auth');

// 사용자 목록 조회
router.get('/', async (req, res) => {
  try {
    const users = await store.getUsers();
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 추가 (관리자만)
router.post('/', requireRole('관리자'), async (req, res) => {
  try {
    const { name, role, avatar } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: '이름과 역할은 필수입니다.' });
    }
    const user = await store.createUser({
      name,
      role,
      avatar: avatar || '#6C5CE7',
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 수정 (관리자만)
router.put('/:id', requireRole('관리자'), async (req, res) => {
  try {
    const { name, role, avatar } = req.body;
    const fields = {};
    if (name !== undefined) fields.name = name;
    if (role !== undefined) fields.role = role;
    if (avatar !== undefined) fields.avatar = avatar;

    const updated = await store.updateUser(req.params.id, fields);
    if (!updated) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 삭제 (관리자만)
router.delete('/:id', requireRole('관리자'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다.' });
    }
    const deleted = await store.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
