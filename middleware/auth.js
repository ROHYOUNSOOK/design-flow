const { getUserFromRequest } = require('../lib/auth');
const { getUserById } = require('../lib/store');

function requireLogin(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    req.user = user;
    next();
  };
}

function requireApproved(req, res, next) {
  getUserById(req.user.id).then(dbUser => {
    if (!dbUser || dbUser.approved === false) {
      return res.status(403).json({ error: '관리자의 승인을 기다리고 있습니다.' });
    }
    next();
  }).catch(() => {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  });
}

module.exports = { requireLogin, requireRole, requireApproved };
