import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { data: null, error: 'Too many subscription attempts. Please try again later.' }
});

const notifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { data: null, error: 'Too many notification requests. Please try again later.' }
});

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const notifyMeSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  email: z.string().email('Please enter a valid email address')
});

// POST /api/newsletter
router.post('/newsletter', newsletterLimiter, validateBody(newsletterSchema), (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  
  try {
    db.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').run(email);
    return res.json({
      data: { message: 'Thank you for subscribing to TechBazaar private releases!' },
      error: null
    });
  } catch {
    return res.status(500).json({ data: null, error: 'Failed to subscribe. Please try again.' });
  }
});

// POST /api/notify-me
router.post('/notify-me', notifyLimiter, validateBody(notifyMeSchema), (req, res) => {
  const { productId, email } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    db.prepare('INSERT INTO notify_requests (product_id, email) VALUES (?, ?)').run(productId, cleanEmail);
    return res.json({
      data: { message: "We'll notify you via email the moment this item is restocked." },
      error: null
    });
  } catch {
    return res.status(500).json({ data: null, error: 'Failed to record notification request.' });
  }
});

export default router;
