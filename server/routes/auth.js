import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db/index.js';
import { generateToken, COOKIE_OPTIONS, requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  guestOrderNumber: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional()
});

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), (req, res) => {
  const { email, password, name, guestOrderNumber } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({
      data: null,
      error: 'An account with this email address already exists. Please sign in.'
    });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const insertStmt = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, 'customer')
  `);

  const result = insertStmt.run(normalizedEmail, passwordHash, name.trim());
  const userId = result.lastInsertRowid;

  // Claim guest order if specified
  let claimedOrder = false;
  if (guestOrderNumber) {
    const claimStmt = db.prepare(`
      UPDATE orders
      SET user_id = ?
      WHERE order_number = ? AND (LOWER(guest_email) = ? OR user_id IS NULL)
    `);
    const updateResult = claimStmt.run(userId, guestOrderNumber.trim(), normalizedEmail);
    claimedOrder = updateResult.changes > 0;
  }

  // Also link any other guest orders previously placed with this email
  db.prepare(`
    UPDATE orders
    SET user_id = ?
    WHERE LOWER(guest_email) = ? AND user_id IS NULL
  `).run(userId, normalizedEmail);

  const newUser = {
    id: userId,
    email: normalizedEmail,
    name: name.trim(),
    role: 'customer'
  };

  const token = generateToken(newUser);
  res.cookie('token', token, COOKIE_OPTIONS);

  return res.status(201).json({
    data: {
      user: newUser,
      claimedOrder
    },
    error: null
  });
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = db.prepare(`
    SELECT id, email, password_hash, name, role, must_change_password, created_at
    FROM users
    WHERE email = ?
  `).get(normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      data: null,
      error: 'Invalid email or password.'
    });
  }

  // Auto-link past guest orders with matching email
  const linkStmt = db.prepare(`
    UPDATE orders
    SET user_id = ?
    WHERE LOWER(guest_email) = ? AND user_id IS NULL
  `);
  const linkResult = linkStmt.run(user.id, normalizedEmail);

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
    createdAt: user.created_at
  };

  const token = generateToken(safeUser);
  res.cookie('token', token, COOKIE_OPTIONS);

  return res.json({
    data: {
      user: safeUser,
      linkedOrdersCount: linkResult.changes
    },
    error: null
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  return res.json({
    data: { message: 'Successfully signed out' },
    error: null
  });
});

// GET /api/auth/me
router.get('/me', optionalAuth, (req, res) => {
  return res.json({
    data: {
      user: req.user ? {
        ...req.user,
        mustChangePassword: Boolean(req.user.must_change_password)
      } : null
    },
    error: null
  });
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, validateBody(updateProfileSchema), (req, res) => {
  const { name } = req.body;
  if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);
  }

  const updatedUser = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  return res.json({
    data: { user: updatedUser },
    error: null
  });
});

export default router;
