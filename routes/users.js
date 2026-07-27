const express = require('express');
const router = express.Router();
const store = require('../lib/store');

router.get('/', async (req, res) => {
  try {
    const users = await store.getUsers();
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
