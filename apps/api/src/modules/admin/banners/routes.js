import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from '../../../../db/index.js';
import { UPLOADS_DIR } from '../../../../config/paths.js';
import { validateBody } from '../../../core/middleware/validate.js';
import { validateImageUpload } from '../../../core/utils/imageSecurity.js';
import * as adminSchemas from '../schemas.js';
import { logActivity } from '../helpers.js';

const router = Router();

// --- BANNERS & ADS MANAGEMENT ---

// GET /api/admin/banners - list all banners with analytics
router.get('/banners', (req, res) => {
  const rawBanners = db.prepare(`
    SELECT b.*,
      COALESCE(SUM(s.impressions), 0) AS total_impressions,
      COALESCE(SUM(s.clicks), 0) AS total_clicks,
      CASE WHEN SUM(s.impressions) > 0 
        THEN ROUND((CAST(SUM(s.clicks) AS REAL) / SUM(s.impressions)) * 100, 2)
        ELSE 0 END AS ctr
    FROM banners b
    LEFT JOIN banner_stats s ON b.id = s.banner_id
    GROUP BY b.id
    ORDER BY b.slot ASC, b.sort_order ASC, b.id ASC
  `).all();

  const banners = rawBanners.map(b => ({
    ...b,
    image_desktop: b.desktop_image,
    image_mobile: b.mobile_image,
    label_pill: b.label,
    is_active: b.active,
    priority: b.sort_order,
    impressions: b.total_impressions,
    clicks: b.total_clicks
  }));

  return res.json({ data: { banners }, error: null });
});

// POST /api/admin/banners - create banner
router.post('/banners', validateBody(adminSchemas.bannerCreateSchema), (req, res) => {
  const b = req.body;
  const desktop_image = b.desktop_image || b.image_desktop;
  if (!b.title || !b.slot || !desktop_image) {
    return res.status(400).json({ data: null, error: 'Title, slot, and desktop image are required.' });
  }

  const mobile_image = b.mobile_image || b.image_mobile || desktop_image;
  const label = b.label !== undefined ? b.label : (b.label_pill !== undefined ? b.label_pill : null);
  const active = b.active !== undefined ? (b.active ? 1 : 0) : (b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1);
  const sort_order = b.sort_order !== undefined ? Number(b.sort_order) : (b.priority !== undefined ? Number(b.priority) : 0);
  const audience = b.audience || 'both';

  const result = db.prepare(`
    INSERT INTO banners (
      title, slot, desktop_image, mobile_image, thumb, focal_x, focal_y,
      alt, link_type, link_target, new_tab, label, starts_at, ends_at,
      active, sort_order, audience
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    b.title.trim(),
    b.slot,
    desktop_image,
    mobile_image,
    b.thumb || mobile_image || desktop_image,
    b.focal_x !== undefined ? Number(b.focal_x) : 50,
    b.focal_y !== undefined ? Number(b.focal_y) : 50,
    b.alt ? b.alt.trim() : b.title.trim(),
    b.link_type || 'none',
    b.link_target || '',
    b.new_tab ? 1 : 0,
    label,
    b.starts_at || null,
    b.ends_at || null,
    active,
    sort_order,
    audience
  );

  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(result.lastInsertRowid);
  logActivity('create', 'banner', banner.id, `Created banner "${banner.title}" for slot "${banner.slot}"`);

  return res.status(201).json({ data: { banner: {
    ...banner,
    image_desktop: banner.desktop_image,
    image_mobile: banner.mobile_image,
    label_pill: banner.label,
    is_active: banner.active,
    priority: banner.sort_order
  } }, error: null });
});

// PUT /api/admin/banners/:id - update banner
router.put('/banners/:id', validateBody(adminSchemas.bannerUpdateSchema), (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Banner not found.' });
  }

  const desktop_image = b.desktop_image || b.image_desktop || existing.desktop_image;
  const mobile_image = b.mobile_image || b.image_mobile || existing.mobile_image;
  const label = b.label !== undefined ? b.label : (b.label_pill !== undefined ? b.label_pill : existing.label);
  const active = b.active !== undefined ? (b.active ? 1 : 0) : (b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.active);
  const sort_order = b.sort_order !== undefined ? Number(b.sort_order) : (b.priority !== undefined ? Number(b.priority) : existing.sort_order);
  const audience = b.audience !== undefined ? b.audience : (existing.audience || 'both');

  db.prepare(`
    UPDATE banners SET
      title = ?, slot = ?, desktop_image = ?, mobile_image = ?, thumb = ?,
      focal_x = ?, focal_y = ?, alt = ?, link_type = ?, link_target = ?,
      new_tab = ?, label = ?, starts_at = ?, ends_at = ?, active = ?, sort_order = ?,
      audience = ?
    WHERE id = ?
  `).run(
    b.title ? b.title.trim() : existing.title,
    b.slot || existing.slot,
    desktop_image,
    mobile_image,
    b.thumb || existing.thumb || mobile_image,
    b.focal_x !== undefined ? Number(b.focal_x) : existing.focal_x,
    b.focal_y !== undefined ? Number(b.focal_y) : existing.focal_y,
    b.alt ? b.alt.trim() : existing.alt,
    b.link_type !== undefined ? b.link_type : existing.link_type,
    b.link_target !== undefined ? b.link_target : existing.link_target,
    b.new_tab !== undefined ? (b.new_tab ? 1 : 0) : existing.new_tab,
    label,
    b.starts_at !== undefined ? b.starts_at : existing.starts_at,
    b.ends_at !== undefined ? b.ends_at : existing.ends_at,
    active,
    sort_order,
    audience,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  logActivity('update', 'banner', updated.id, `Updated banner "${updated.title}"`);

  return res.json({ data: { banner: {
    ...updated,
    image_desktop: updated.desktop_image,
    image_mobile: updated.mobile_image,
    label_pill: updated.label,
    is_active: updated.active,
    priority: updated.sort_order
  } }, error: null });
});

// DELETE /api/admin/banners/:id
router.delete('/banners/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Banner not found.' });
  }

  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  logActivity('delete', 'banner', req.params.id, `Deleted banner "${existing.title}"`, existing, null, true);

  return res.json({ data: { message: 'Banner deleted successfully' }, error: null });
});

// PATCH /api/admin/banners/:id/toggle
router.patch('/banners/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Banner not found.' });
  }

  const nextState = existing.active ? 0 : 1;
  db.prepare('UPDATE banners SET active = ? WHERE id = ?').run(nextState, req.params.id);

  return res.json({ data: { id: existing.id, active: nextState }, error: null });
});

// POST /api/admin/banners/reorder
router.post('/banners/reorder', validateBody(adminSchemas.bannerReorderSchema), (req, res) => {
  const { bannerIds } = req.body;
  if (!Array.isArray(bannerIds)) {
    return res.status(400).json({ data: null, error: 'bannerIds array required' });
  }

  const stmt = db.prepare('UPDATE banners SET sort_order = ? WHERE id = ?');
  const updateMany = db.transaction((ids) => {
    ids.forEach((id, idx) => stmt.run(idx, id));
  });
  updateMany(bannerIds);

  return res.json({ data: { message: 'Banners reordered successfully' }, error: null });
});

// POST /api/admin/banners/upload - PNG/JPEG/WebP only (rejects SVG, validates magic bytes & dimensions)
router.post('/banners/upload', validateBody(adminSchemas.bannerUploadSchema), (req, res) => {
  try {
    const base64 = req.body.base64 || req.body.imageBase64 || req.body.image;
    const rawType = req.body.type || req.body.deviceType || 'banner';
    const safeType = String(rawType).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'banner';

    const check = validateImageUpload(base64, { maxBytes: 5 * 1024 * 1024, minDim: 16, maxDim: 4096 });
    if (!check.valid) {
      return res.status(400).json({ data: null, error: check.error });
    }

    const uploadDir = path.join(UPLOADS_DIR, 'banners');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanFilename = `${safeType}_${crypto.randomBytes(12).toString('hex')}.${check.ext}`;
    const filePath = path.join(uploadDir, cleanFilename);
    fs.writeFileSync(filePath, check.buffer);

    const publicUrl = `/uploads/banners/${cleanFilename}`;
    return res.json({
      data: { url: publicUrl, filename: cleanFilename, width: check.width, height: check.height },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/admin/banners/export/csv
router.get('/banners/export/csv', (req, res) => {
  const stats = db.prepare(`
    SELECT b.id, b.title, b.slot, b.active,
           COALESCE(SUM(s.impressions), 0) AS total_impressions,
           COALESCE(SUM(s.clicks), 0) AS total_clicks,
           CASE WHEN SUM(s.impressions) > 0 
             THEN ROUND((CAST(SUM(s.clicks) AS REAL) / SUM(s.impressions)) * 100, 2)
             ELSE 0 END AS ctr
    FROM banners b
    LEFT JOIN banner_stats s ON b.id = s.banner_id
    GROUP BY b.id
    ORDER BY b.slot ASC, b.id ASC
  `).all();

  const headers = ['ID', 'Title', 'Slot', 'Active', 'Impressions', 'Clicks', 'CTR (%)'];
  const rows = [headers.join(',')];
  for (const s of stats) {
    rows.push([
      s.id,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      s.slot,
      s.active ? 'Yes' : 'No',
      s.total_impressions,
      s.total_clicks,
      s.ctr
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="banner-analytics.csv"');
  return res.send(rows.join('\n'));
});

export default router;
