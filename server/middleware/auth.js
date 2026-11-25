import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db/index.js';

let ephemeralDevSecret = null;

export function getJwtSecret() {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32 && envSecret !== 'your_jwt_secret_key_here') {
    return envSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable must be set to a strong secret (32+ chars) in production.');
  }
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = envSecret && envSecret !== 'your_jwt_secret_key_here'
      ? envSecret
      : crypto.randomBytes(32).toString('hex');
    if (!envSecret || envSecret === 'your_jwt_secret_key_here') {
      console.warn('⚠️  JWT_SECRET missing/placeholder in dev; using ephemeral per-process secret.');
    }
  }
  return ephemeralDevSecret;
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenVersion: user.token_version ?? 0 },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const user = db.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.must_change_password, u.token_version, u.created_at,
             u.buyer_type, u.wholesale_status, u.group_id, u.business_name, u.gstin,
             u.credit_limit_override,
             wg.name as group_name, wg.extra_discount_percent, wg.credit_limit as group_credit_limit,
             wg.payment_terms as group_payment_terms, wg.min_order_value as group_mov,
             wg.free_shipping_threshold as group_free_shipping
      FROM users u
      LEFT JOIN wholesale_groups wg ON u.group_id = wg.id
      WHERE u.id = ?
    `).get(decoded.id);

    if (!user || (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.token_version ?? 0))) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        data: null,
        error: 'Authentication required. Please sign in.'
      });
    }
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        data: null,
        error: 'Access denied. Administrator privileges required.'
      });
    }
    next();
  });
}

export function requireApprovedWholesaleBuyer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role === 'admin') {
      return next();
    }
    const buyerType = req.user?.buyer_type || req.user?.buyerType;
    const wholesaleStatus = req.user?.wholesale_status || req.user?.wholesaleStatus;
    if (buyerType !== 'wholesale' || wholesaleStatus !== 'approved') {
      return res.status(403).json({
        data: null,
        error: wholesaleStatus === 'pending'
          ? 'Your wholesale business application is currently pending admin review.'
          : 'Access restricted to approved wholesale business buyers only.'
      });
    }
    next();
  });
}
