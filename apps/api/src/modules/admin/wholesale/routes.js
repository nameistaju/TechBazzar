import { Router } from 'express';
import db from '../../../../db/index.js';
import { logActivity } from '../helpers.js';

const router = Router();

// ==========================================
// 13. WHOLESALE APPLICATIONS & GROUPS
// ==========================================

// GET /api/admin/wholesale/applications?status=pending|approved|rejected|all
router.get('/wholesale/applications', (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT wa.*, u.email as user_email, u.name as user_name, u.group_id as user_group_id
    FROM wholesale_applications wa
    LEFT JOIN users u ON wa.user_id = u.id
  `;
  const params = [];
  if (status && status !== 'all') {
    sql += ' WHERE wa.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY wa.created_at DESC';
  const applications = db.prepare(sql).all(...params);
  return res.json({ data: { applications }, error: null });
});

// POST /api/admin/wholesale/applications/:id/approve
router.post('/wholesale/applications/:id/approve', (req, res) => {
  const appId = Number(req.params.id);
  const { groupId = 1 } = req.body || {};
  const app = db.prepare('SELECT * FROM wholesale_applications WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ data: null, error: 'Application not found.' });

  const group = db.prepare('SELECT * FROM wholesale_groups WHERE id = ?').get(Number(groupId));
  if (!group) return res.status(400).json({ data: null, error: 'Invalid wholesale group selected.' });

  const approveTx = db.transaction(() => {
    db.prepare(`
      UPDATE wholesale_applications
      SET status = 'approved', assigned_group_id = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(group.id, appId);

    if (app.user_id) {
      db.prepare(`
        UPDATE users
        SET buyer_type = 'wholesale', wholesale_status = 'approved', group_id = ?,
            business_name = COALESCE(business_name, ?), gstin = COALESCE(gstin, ?),
            phone = COALESCE(phone, ?), city = COALESCE(city, ?)
        WHERE id = ?
      `).run(group.id, app.business_name, app.gstin, app.phone, app.city, app.user_id);
    }
  });
  approveTx();

  logActivity('approve', 'wholesale_application', appId, `Approved wholesale application for ${app.business_name} (${group.name})`);
  return res.json({ data: { message: `Approved ${app.business_name} under ${group.name}` }, error: null });
});

// POST /api/admin/wholesale/applications/:id/reject
router.post('/wholesale/applications/:id/reject', (req, res) => {
  const appId = Number(req.params.id);
  const { reason = '' } = req.body || {};
  const app = db.prepare('SELECT * FROM wholesale_applications WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ data: null, error: 'Application not found.' });

  const rejectTx = db.transaction(() => {
    db.prepare(`
      UPDATE wholesale_applications
      SET status = 'rejected', rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason.trim() || 'Does not meet wholesale criteria.', appId);

    if (app.user_id) {
      db.prepare("UPDATE users SET wholesale_status = 'rejected' WHERE id = ?").run(app.user_id);
    }
  });
  rejectTx();

  logActivity('reject', 'wholesale_application', appId, `Rejected wholesale application for ${app.business_name}`);
  return res.json({ data: { message: `Rejected application for ${app.business_name}` }, error: null });
});

// POST /api/admin/wholesale/convert-customer
router.post('/wholesale/convert-customer', (req, res) => {
  const { userId, groupId = 1, businessName, gstin } = req.body || {};
  if (!userId) return res.status(400).json({ data: null, error: 'User ID is required.' });

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(Number(userId));
  if (!user) return res.status(404).json({ data: null, error: 'User account not found.' });

  const group = db.prepare('SELECT id, name FROM wholesale_groups WHERE id = ?').get(Number(groupId));
  if (!group) return res.status(400).json({ data: null, error: 'Invalid wholesale group.' });

  db.prepare(`
    UPDATE users
    SET buyer_type = 'wholesale', wholesale_status = 'approved', group_id = ?,
        business_name = COALESCE(?, business_name), gstin = COALESCE(?, gstin)
    WHERE id = ?
  `).run(group.id, businessName || user.name, gstin || null, user.id);

  logActivity('update', 'user', user.id, `Converted ${user.email} to wholesale (${group.name})`);
  return res.json({ data: { message: `${user.name} converted to wholesale (${group.name})` }, error: null });
});

// GET /api/admin/wholesale/groups
router.get('/wholesale/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM wholesale_groups ORDER BY id ASC').all();
  return res.json({ data: { groups }, error: null });
});

// POST /api/admin/wholesale/groups
router.post('/wholesale/groups', (req, res) => {
  const { name, extra_discount_percent = 0, credit_limit = 0, payment_terms = 'prepaid', min_order_value = 250000, free_shipping_threshold = 1000000 } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ data: null, error: 'Group name is required.' });

  const info = db.prepare(`
    INSERT INTO wholesale_groups (name, extra_discount_percent, credit_limit, payment_terms, min_order_value, free_shipping_threshold)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(name).trim(), Number(extra_discount_percent), Math.round(Number(credit_limit)), String(payment_terms), Math.round(Number(min_order_value)), Math.round(Number(free_shipping_threshold)));

  logActivity('create', 'wholesale_group', info.lastInsertRowid, `Created wholesale group ${name}`);
  return res.status(201).json({ data: { id: info.lastInsertRowid }, error: null });
});

// PUT /api/admin/wholesale/groups/:id
router.put('/wholesale/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM wholesale_groups WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ data: null, error: 'Group not found.' });

  const { name, extra_discount_percent, credit_limit, payment_terms, min_order_value, free_shipping_threshold } = req.body || {};
  db.prepare(`
    UPDATE wholesale_groups
    SET name = ?, extra_discount_percent = ?, credit_limit = ?, payment_terms = ?, min_order_value = ?, free_shipping_threshold = ?
    WHERE id = ?
  `).run(
    name !== undefined ? String(name).trim() : existing.name,
    extra_discount_percent !== undefined ? Number(extra_discount_percent) : existing.extra_discount_percent,
    credit_limit !== undefined ? Math.round(Number(credit_limit)) : existing.credit_limit,
    payment_terms !== undefined ? String(payment_terms) : existing.payment_terms,
    min_order_value !== undefined ? Math.round(Number(min_order_value)) : existing.min_order_value,
    free_shipping_threshold !== undefined ? Math.round(Number(free_shipping_threshold)) : existing.free_shipping_threshold,
    id
  );

  logActivity('update', 'wholesale_group', id, `Updated wholesale group ${name || existing.name}`);
  return res.json({ data: { message: 'Wholesale group updated' }, error: null });
});

// DELETE /api/admin/wholesale/groups/:id
router.delete('/wholesale/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const inUse = db.prepare('SELECT COUNT(*) as c FROM users WHERE group_id = ?').get(id);
  if (inUse?.c > 0) return res.status(409).json({ data: null, error: 'Cannot delete group with assigned buyers.' });
  db.prepare('DELETE FROM wholesale_groups WHERE id = ?').run(id);
  return res.json({ data: { message: 'Wholesale group deleted' }, error: null });
});

export default router;
