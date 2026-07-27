const { getUserFromRequest } = require('../lib/auth');

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

module.exports = { requireLogin, requireRole };
