import { Router } from 'express';
import fs from 'fs';
import db from '../../../../db/index.js';
import { DB_PATH } from '../../../../config/paths.js';
import { validateQuery } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { undoMerge } from '../products/dedupService.js';
import { logActivity, getSettingsMap } from '../helpers.js';

const router = Router();

// ==========================================
// 11. SETTINGS & DATA MANAGEMENT
// ==========================================

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  return res.json({ data: { settings: getSettingsMap() }, error: null });
});

// POST /api/admin/settings
router.post('/settings', (req, res) => {
  const newSettings = req.body;
  const insert = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    for (const [k, v] of Object.entries(newSettings)) {
      insert.run(k, String(v));
    }
  })();

  logActivity('update', 'setting', 'all', 'Updated system and invoice configuration settings');
  return res.json({ data: { message: 'Settings saved successfully' }, error: null });
});

// GET /api/admin/settings/backup (Download full SQLite database)
router.get('/settings/backup', (req, res) => {
  const dbPath = DB_PATH;
  if (!fs.existsSync(dbPath)) {
    return res.status(404).send('Database file not found');
  }

  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="techbazaar_backup_${new Date().toISOString().split('T')[0]}.db"`);
  const fileStream = fs.createReadStream(dbPath);
  return fileStream.pipe(res);
});

// POST /api/admin/settings/purge-logs (>90 days old)
router.post('/settings/purge-logs', (req, res) => {
  const del = db.prepare("DELETE FROM activity_log WHERE created_at < DATE('now', '-90 days')").run();
  return res.json({ data: { deletedCount: del.changes }, error: null });
});

// ==========================================
// 12. ACTIVITY LOG & 1-CLICK UNDO
// ==========================================

// GET /api/admin/activity-log
router.get('/activity-log', validateQuery(adminSchemas.paginationQuerySchema), (req, res) => {
  const { entity, action, limit = 100 } = req.query;
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
  let query = 'SELECT * FROM activity_log WHERE 1=1';
  const params = [];

  if (entity && entity !== 'all') {
    query += ' AND entity_type = ?';
    params.push(entity);
  }
  if (action && action !== 'all') {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(safeLimit);

  const logs = db.prepare(query).all(...params);
  return res.json({ data: { logs }, error: null });
});

// POST /api/admin/activity-log/:id/undo (1-Click Safe Undo)
router.post('/activity-log/:id/undo', (req, res) => {
  const log = db.prepare('SELECT * FROM activity_log WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ data: null, error: 'Log entry not found.' });
  if (!log.undoable || log.undone) {
    return res.status(400).json({ data: null, error: 'This action is not undoable or has already been undone.' });
  }

  const before = log.before_state ? JSON.parse(log.before_state) : null;
  if (!before) {
    return res.status(400).json({ data: null, error: 'No previous snapshot available for undo.' });
  }

  if (log.action === 'merge_products') {
    try {
      const undoRes = undoMerge(log.id);
      return res.json({ data: undoRes, error: null });
    } catch (err) {
      return res.status(400).json({ data: null, error: err.message });
    }
  }

  if (log.entity_type === 'product') {
    if (log.action === 'price_change' || log.action === 'update') {
      if (before.price !== undefined) {
        db.prepare('UPDATE products SET price = ? WHERE id = ?').run(before.price, log.entity_id);
      }
      if (before.stock !== undefined) {
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(before.stock, log.entity_id);
      }
    } else if (log.action === 'delete') {
      // Restore product
      db.prepare('UPDATE products SET deleted_at = NULL, status = ? WHERE id = ?').run(before.status || 'active', log.entity_id);
    } else if (log.action === 'stock_change') {
      if (before.stock !== undefined) {
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(before.stock, log.entity_id);
      }
    }
  }

  db.prepare('UPDATE activity_log SET undone = 1 WHERE id = ?').run(log.id);
  logActivity('undo', log.entity_type, log.entity_id, `Undid previous action: ${log.details}`);

  return res.json({ data: { message: 'Action successfully undone.' }, error: null });
});

export default router;
