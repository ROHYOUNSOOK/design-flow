const express = require('express');
const router = express.Router();
const { getUserByEmail, createUser } = require('../lib/store');
const { createToken, setTokenCookie, clearTokenCookie, getUserFromRequest } = require('../lib/auth');

const ALLOWED_DOMAIN = 'daplan.com';
const ADMIN_EMAIL = 'admin@daplan.com';

const AVATAR_COLORS = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#0984E3', '#D63031', '#00CEC9', '#E84393', '#636E72', '#2D3436'];
function randomAvatar() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// 이메일 로그인 (@daplan.com만 허용)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '이메일을 입력해주세요.' });
    }

    const domain = email.split('@')[1];
    if (!domain || domain.toLowerCase() !== ALLOWED_DOMAIN) {
      return res.status(403).json({ error: `@${ALLOWED_DOMAIN} 계정만 접속할 수 있습니다.` });
    }

    let user = await getUserByEmail(email.toLowerCase());

    if (!user) {
      const name = email.split('@')[0];
      const role = email.toLowerCase() === ADMIN_EMAIL ? '관리자' : '팀원';
      user = await createUser({
        name,
        role,
        avatar: randomAvatar(),
        email: email.toLowerCase(),
      });
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
