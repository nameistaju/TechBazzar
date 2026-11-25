import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../../../db/index.js';
import { COOKIE_OPTIONS, generateToken } from '../../../core/middleware/auth.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { logActivity } from '../helpers.js';

const router = Router();

// ==========================================
// 1. ADMIN ACCOUNT & PROFILE
// ==========================================

// GET /api/admin/me
router.get('/me', (req, res) => {
  const adminUser = db.prepare('SELECT id, email, name, role, must_change_password, created_at FROM users WHERE id = ?').get(req.user.id);
  return res.json({ data: { admin: adminUser }, error: null });
});

const COMMON_WEAK_PASSWORDS = new Set([
  'admin12345', 'password123', 'password1234', '1234567890', 'qwerty12345',
  'techbazaar', 'techbazaar123', 'letmein1234', 'welcome1234', 'changeme123'
]);

// POST /api/admin/change-password
router.post('/change-password', validateBody(adminSchemas.changePasswordSchema), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT id, email, role, password_hash, token_version FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ data: null, error: 'Admin account not found.' });
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ data: null, error: 'Current password is incorrect.' });
  }

  if (newPassword.trim().toLowerCase() === user.email.toLowerCase()) {
    return res.status(400).json({ data: null, error: 'New password cannot be the same as your email address.' });
  }

  if (COMMON_WEAK_PASSWORDS.has(newPassword.trim().toLowerCase())) {
    return res.status(400).json({ data: null, error: 'Please choose a stronger password (too common).' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const newTokenVersion = (user.token_version ?? 0) + 1;
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, token_version = ? WHERE id = ?')
    .run(newHash, newTokenVersion, req.user.id);

  // Re-issue cookie for current session so admin stays signed in while all other sessions are invalidated
  const token = generateToken({ ...user, token_version: newTokenVersion });
  res.cookie('token', token, COOKIE_OPTIONS);

  logActivity('update', 'admin', req.user.id, 'Admin password changed and other sessions invalidated');
  return res.json({ data: { message: 'Password updated successfully' }, error: null });
});

// PATCH /api/admin/profile
router.patch('/profile', validateBody(adminSchemas.updateProfileSchema), (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ data: null, error: 'Name and email are required.' });
  }

  const before = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), email.trim().toLowerCase(), req.user.id);
  const after = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);

  // Re-issue token with new email if changed
  const token = generateToken({ ...req.user, email: after.email, name: after.name });
  res.cookie('token', token, COOKIE_OPTIONS);

  logActivity('update', 'admin', req.user.id, `Updated admin profile to ${after.name} (${after.email})`, before, after);
  return res.json({ data: { admin: after }, error: null });
});

// POST /api/admin/forgot-password (mock flow for single owner)
router.post('/forgot-password', (req, res) => {
  return res.json({
    data: {
      message: 'Password reset link and verification code sent to owner registered email.'
    },
    error: null
  });
});

export default router;
