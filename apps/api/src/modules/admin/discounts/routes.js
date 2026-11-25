import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { evaluateDiscount } from '../../../services/calculation/index.js';
import { logActivity } from '../helpers.js';

const router = Router();

// ==========================================
// 6. DISCOUNTS ENGINE
// ==========================================

// GET /api/admin/discounts
router.get('/discounts', (req, res) => {
  const discounts = db.prepare('SELECT * FROM discounts ORDER BY priority ASC, created_at DESC').all();
  return res.json({ data: { discounts }, error: null });
});

// POST /api/admin/discounts
router.post('/discounts', validateBody(adminSchemas.discountSchema), (req, res) => {
  const d = req.body;
  if (!d.title || !d.type) {
    return res.status(400).json({ data: null, error: 'Title and type are required.' });
  }

  const insert = db.prepare(`
    INSERT INTO discounts (
      code, title, description, type, value, rule_percentage, rule_flat, rule_mode,
      scope, scope_values, min_cart_amount, min_quantity, first_order_only,
      stackable, priority, usage_limit, limit_per_customer, starts_at, ends_at, active
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const code = d.code ? d.code.trim().toUpperCase() : null;
  const resInsert = insert.run(
    code,
    d.title.trim(),
    d.description || '',
    d.type,
    Number(d.value) || 0,
    d.rulePercentage !== undefined ? Number(d.rulePercentage) : null,
    d.ruleFlat !== undefined ? Number(d.ruleFlat) : null,
    d.ruleMode || 'higher',
    d.scope || 'cart',
    d.scopeValues ? JSON.stringify(d.scopeValues) : null,
    Number(d.minCartAmount) || 0,
    Number(d.minQuantity) || 0,
    d.firstOrderOnly ? 1 : 0,
    d.stackable ? 1 : 0,
    Number(d.priority) || 1,
    d.usageLimit ? Number(d.usageLimit) : null,
    Number(d.limitPerCustomer) || 1,
    d.startsAt || null,
    d.endsAt || null,
    d.active !== false ? 1 : 0
  );

  logActivity('create', 'discount', resInsert.lastInsertRowid, `Created discount rule "${d.title}" (${code || 'Automatic'})`);
  return res.status(201).json({ data: { id: resInsert.lastInsertRowid }, error: null });
});

// PATCH /api/admin/discounts/:id
router.patch('/discounts/:id', validateBody(adminSchemas.discountUpdateSchema), (req, res) => {
  const d = req.body;
  const existing = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ data: null, error: 'Discount not found.' });

  const updates = [];
  const params = [];

  if (d.code !== undefined) { updates.push('code = ?'); params.push(d.code ? d.code.trim().toUpperCase() : null); }
  if (d.title !== undefined) { updates.push('title = ?'); params.push(d.title.trim()); }
  if (d.description !== undefined) { updates.push('description = ?'); params.push(d.description); }
  if (d.type !== undefined) { updates.push('type = ?'); params.push(d.type); }
  if (d.value !== undefined) { updates.push('value = ?'); params.push(Number(d.value)); }
  if (d.rulePercentage !== undefined) { updates.push('rule_percentage = ?'); params.push(Number(d.rulePercentage)); }
  if (d.ruleFlat !== undefined) { updates.push('rule_flat = ?'); params.push(Number(d.ruleFlat)); }
  if (d.ruleMode !== undefined) { updates.push('rule_mode = ?'); params.push(d.ruleMode); }
  if (d.scope !== undefined) { updates.push('scope = ?'); params.push(d.scope); }
  if (d.scopeValues !== undefined) { updates.push('scope_values = ?'); params.push(JSON.stringify(d.scopeValues)); }
  if (d.minCartAmount !== undefined) { updates.push('min_cart_amount = ?'); params.push(Number(d.minCartAmount)); }
  if (d.minQuantity !== undefined) { updates.push('min_quantity = ?'); params.push(Number(d.minQuantity)); }
  if (d.active !== undefined) { updates.push('active = ?'); params.push(d.active ? 1 : 0); }
  if (d.startsAt !== undefined) { updates.push('starts_at = ?'); params.push(d.startsAt); }
  if (d.endsAt !== undefined) { updates.push('ends_at = ?'); params.push(d.endsAt); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE discounts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  logActivity('update', 'discount', req.params.id, `Updated discount "${existing.title}"`);
  return res.json({ data: { message: 'Discount updated successfully' }, error: null });
});

// DELETE /api/admin/discounts/:id
router.delete('/discounts/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM discounts WHERE id = ?').run(req.params.id);
  logActivity('delete', 'discount', req.params.id, `Deleted discount "${d?.title || req.params.id}"`);
  return res.json({ data: { message: 'Discount deleted' }, error: null });
});

// POST /api/admin/discounts/simulate (Live Test Simulator Panel)
router.post('/discounts/simulate', validateBody(adminSchemas.simulateDiscountSchema), (req, res) => {
  const { discountId, code, cartItems } = req.body;
  let discount = null;

  if (discountId) {
    discount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(discountId);
  } else if (code) {
    discount = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?)').get(code.trim());
  }

  if (!discount) {
    return res.json({ data: { valid: false, reason: 'Discount rule not found.' }, error: null });
  }

  // Populate cart items with real prices/categories if only IDs were passed
  const items = (cartItems || []).map(ci => {
    const prod = db.prepare('SELECT id, name, category, brand, price FROM products WHERE id = ?').get(ci.productId || ci.id);
    return {
      id: ci.productId || ci.id,
      price: prod ? prod.price : (ci.price || 1000),
      quantity: Number(ci.quantity) || 1,
      category: prod ? prod.category : (ci.category || 'general'),
      brand: prod ? prod.brand : (ci.brand || 'TechBazaar')
    };
  });

  const evalResult = evaluateDiscount(discount, { items });
  return res.json({ data: evalResult, error: null });
});

export default router;
