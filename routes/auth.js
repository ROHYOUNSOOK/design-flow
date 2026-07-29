const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const { getUserById, getUserByEmail, createUser } = require('../lib/store');
const { createToken, setTokenCookie, clearTokenCookie, getUserFromRequest } = require('../lib/auth');

const ALLOWED_DOMAIN = 'daplan.com';

// 랜덤 아바타 색상 생성
const AVATAR_COLORS = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#0984E3', '#D63031', '#00CEC9', '#E84393', '#636E72', '#2D3436'];
function randomAvatar() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// Google Client ID 반환 (프론트엔드용)
router.get('/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

// Google 로그인
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google 인증 정보가 없습니다.' });
    }

    // Google ID 토큰 검증
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      console.error('Google token verification failed:', err);
      return res.status(401).json({ error: 'Google 인증에 실패했습니다.' });
    }

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    // @daplan.com 도메인 체크
    const domain = email.split('@')[1];
    if (domain !== ALLOWED_DOMAIN) {
      return res.status(403).json({ error: `@${ALLOWED_DOMAIN} 계정만 접속할 수 있습니다.` });
    }

    // 이메일로 기존 사용자 조회
    let user = await getUserByEmail(email);

    if (!user) {
      // 최초 로그인: 팀원 권한으로 자동 생성
      user = await createUser({
        name,
        role: '팀원',
        avatar: randomAvatar(),
        email,
      });
    }

    const token = createToken(user);
    setTokenCookie(res, token);
    res.json({ user });
  } catch (err) {
    console.error('Google login error:', err);
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
