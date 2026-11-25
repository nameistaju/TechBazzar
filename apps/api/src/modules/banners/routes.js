import { Router } from 'express';
import db from '../../../db/index.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for banner impressions and clicks (prevent flooding)
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { data: null, error: 'Tracking rate limit exceeded' }
});

// GET /api/banners - get active banners (optionally filtered by slot and audience)
router.get('/', (req, res, next) => {
  try {
    const { slot, audience } = req.query;
    let query = `
      SELECT id, title, slot, desktop_image, mobile_image, thumb, focal_x, focal_y,
             alt, link_type, link_target, new_tab, label, starts_at, ends_at, active, sort_order, audience
      FROM banners
      WHERE active = 1
        AND (starts_at IS NULL OR starts_at = '' OR DATETIME('now') >= DATETIME(starts_at))
        AND (ends_at IS NULL OR ends_at = '' OR DATETIME('now') <= DATETIME(ends_at))
    `;
    const params = [];

    if (slot) {
      query += ` AND slot = ?`;
      params.push(slot);
    }

    if (audience && ['retail', 'wholesale'].includes(audience)) {
      query += ` AND (audience = 'both' OR audience = ? OR audience IS NULL)`;
      params.push(audience);
    }

    query += ` ORDER BY sort_order ASC, id ASC`;

    const banners = db.prepare(query).all(...params);
    res.json({ data: banners, error: null });
  } catch (err) {
    next(err);
  }
});

// POST /api/banners/:id/impression - track 50% visibility impression
router.post('/:id/impression', trackingLimiter, (req, res, next) => {
  try {
    const bannerId = parseInt(req.params.id, 10);
    if (!bannerId) {
      return res.status(400).json({ data: null, error: 'Invalid banner ID' });
    }

    // Verify banner exists
    const banner = db.prepare('SELECT id FROM banners WHERE id = ?').get(bannerId);
    if (!banner) {
      return res.status(404).json({ data: null, error: 'Banner not found' });
    }

    db.prepare(`
      INSERT INTO banner_stats (banner_id, date, impressions, clicks)
      VALUES (?, DATE('now'), 1, 0)
      ON CONFLICT(banner_id, date) DO UPDATE SET impressions = impressions + 1
    `).run(bannerId);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    next(err);
  }
});

// POST /api/banners/:id/click - track banner click
router.post('/:id/click', trackingLimiter, (req, res, next) => {
  try {
    const bannerId = parseInt(req.params.id, 10);
    if (!bannerId) {
      return res.status(400).json({ data: null, error: 'Invalid banner ID' });
    }

    // Verify banner exists
    const banner = db.prepare('SELECT id FROM banners WHERE id = ?').get(bannerId);
    if (!banner) {
      return res.status(404).json({ data: null, error: 'Banner not found' });
    }

    db.prepare(`
      INSERT INTO banner_stats (banner_id, date, impressions, clicks)
      VALUES (?, DATE('now'), 0, 1)
      ON CONFLICT(banner_id, date) DO UPDATE SET clicks = clicks + 1
    `).run(bannerId);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
