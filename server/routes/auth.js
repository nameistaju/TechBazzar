import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { generateToken, COOKIE_OPTIONS, requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { data: null, error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { data: null, error: 'Too many registration attempts. Please try again later.' }
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  guestOrderNumber: z.string().nullish()
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional()
});

// POST /api/auth/register
router.post('/register', registerLimiter, validateBody(registerSchema), (req, res) => {
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
router.post('/login', loginLimiter, validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = db.prepare(`
    SELECT u.id, u.email, u.password_hash, u.name, u.role, u.must_change_password, u.created_at,
           u.buyer_type, u.wholesale_status, u.group_id, u.business_name, u.gstin,
           u.credit_limit_override,
           wg.name as group_name, wg.extra_discount_percent, wg.credit_limit as group_credit_limit,
           wg.payment_terms as group_payment_terms, wg.min_order_value as group_mov,
           wg.free_shipping_threshold as group_free_shipping
    FROM users u
    LEFT JOIN wholesale_groups wg ON u.group_id = wg.id
    WHERE u.email = ?
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
    buyerType: user.buyer_type || 'retail',
    wholesaleStatus: user.wholesale_status || 'none',
    groupId: user.group_id,
    groupName: user.group_name,
    extraDiscountPercent: user.extra_discount_percent || 0,
    creditLimit: user.credit_limit_override !== null ? user.credit_limit_override : (user.group_credit_limit || 0),
    paymentTerms: user.group_payment_terms || 'prepaid',
    businessName: user.business_name,
    gstin: user.gstin,
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
  if (!req.user) {
    return res.json({ data: { user: null }, error: null });
  }

  const safeUser = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
    buyerType: req.user.buyer_type || 'retail',
    wholesaleStatus: req.user.wholesale_status || 'none',
    groupId: req.user.group_id,
    groupName: req.user.group_name,
    extraDiscountPercent: req.user.extra_discount_percent || 0,
    creditLimit: req.user.credit_limit_override !== null ? req.user.credit_limit_override : (req.user.group_credit_limit || 0),
    paymentTerms: req.user.group_payment_terms || 'prepaid',
    businessName: req.user.business_name,
    gstin: req.user.gstin,
    mustChangePassword: Boolean(req.user.must_change_password),
    createdAt: req.user.created_at
  };

  return res.json({
    data: { user: safeUser },
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
