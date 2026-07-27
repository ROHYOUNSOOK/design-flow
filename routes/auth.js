const express = require('express');
const router = express.Router();
const { getUserById } = require('../lib/store');
const { createToken, setTokenCookie, clearTokenCookie, getUserFromRequest } = require('../lib/auth');

router.post('/login', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: '사용자를 선택해주세요.' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const token = createToken(user);
    setTokenCookie(res, token);
    res.json({ user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  res.json({ user });
});

module.exports = router;
