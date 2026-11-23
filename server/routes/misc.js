import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const notifyMeSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  email: z.string().email('Please enter a valid email address')
});

// POST /api/newsletter
router.post('/newsletter', validateBody(newsletterSchema), (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  
  try {
    db.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').run(email);
    return res.json({
      data: { message: 'Thank you for subscribing to TechBazaar private releases!' },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: 'Failed to subscribe. Please try again.' });
  }
});

// POST /api/notify-me
router.post('/notify-me', validateBody(notifyMeSchema), (req, res) => {
  const { productId, email } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    db.prepare('INSERT INTO notify_requests (product_id, email) VALUES (?, ?)').run(productId, cleanEmail);
    return res.json({
      data: { message: "We'll notify you via email the moment this item is restocked." },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: 'Failed to record notification request.' });
  }
});

export default router;
