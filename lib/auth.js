const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'token';
const MAX_AGE = 24 * 60 * 60; // 24시간 (초)

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role, avatar: user.avatar, email: user.email, approved: user.approved },
    JWT_SECRET,
    { expiresIn: MAX_AGE }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE * 1000, // ms
    path: '/',
  });
}

function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function getUserFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

module.exports = {
  createToken,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
  getUserFromRequest,
  COOKIE_NAME,
};
