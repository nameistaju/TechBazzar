import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { logActivity } from '../helpers.js';

const router = Router();

// ==========================================
// 9. CUSTOMERS CRM
// ==========================================

// GET /api/admin/customers
router.get('/customers', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const customers = db.prepare(query).all(...params);

  // Compute LTV and order count
  const enriched = customers.map(c => {
    const stats = db.prepare(`
      SELECT COUNT(*) as orders_count, COALESCE(SUM(total), 0) as total_spent, MAX(created_at) as last_order_date
      FROM orders
      WHERE LOWER(guest_email) = LOWER(?) OR user_id = ?
    `).get(c.email, c.user_id || 0);

    return {
      ...c,
      tags: c.tags ? JSON.parse(c.tags) : [],
      ordersCount: stats.orders_count || 0,
      totalSpent: stats.total_spent || 0,
      lastOrderDate: stats.last_order_date || null
    };
  });

  return res.json({ data: { customers: enriched }, error: null });
});

// GET /api/admin/customers/:id
router.get('/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ data: null, error: 'Customer not found.' });

  const orders = db.prepare(`
    SELECT id, order_number, total, status, created_at
    FROM orders
    WHERE LOWER(guest_email) = LOWER(?) OR user_id = ?
    ORDER BY created_at DESC
  `).all(customer.email, customer.user_id || 0);

  const invoices = db.prepare(`
    SELECT id, invoice_number, total, balance_due, status, invoice_date
    FROM invoices
    WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)
    ORDER BY created_at DESC
  `).all(customer.id, customer.email);

  const discountSavings = db.prepare(`
    SELECT COALESCE(SUM(amount_saved), 0) as total_savings
    FROM discount_usage
    WHERE LOWER(customer_email) = LOWER(?)
  `).get(customer.email);

  return res.json({
    data: {
      customer: {
        ...customer,
        tags: customer.tags ? JSON.parse(customer.tags) : [],
        billingAddress: customer.billing_address ? JSON.parse(customer.billing_address) : {},
        shippingAddress: customer.shipping_address ? JSON.parse(customer.shipping_address) : {},
        orders,
        invoices,
        totalSavings: discountSavings.total_savings
      }
    },
    error: null
  });
});

// POST /api/admin/customers
router.post('/customers', validateBody(adminSchemas.customerCreateSchema), (req, res) => {
  const c = req.body;
  if (!c.name || !c.email) {
    return res.status(400).json({ data: null, error: 'Name and email are required.' });
  }

  const existing = db.prepare('SELECT id FROM customers WHERE LOWER(email) = LOWER(?)').get(c.email.trim());
  if (existing) {
    return res.status(409).json({ data: null, error: 'A customer with this email already exists.' });
  }

  const insert = db.prepare(`
    INSERT INTO customers (name, email, phone, gstin, billing_address, shipping_address, tags, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resInsert = insert.run(
    c.name.trim(),
    c.email.trim().toLowerCase(),
    c.phone ? c.phone.trim() : null,
    c.gstin ? c.gstin.trim() : null,
    JSON.stringify(c.billingAddress || {}),
    JSON.stringify(c.shippingAddress || {}),
    JSON.stringify(c.tags || []),
    c.notes || ''
  );

  logActivity('create', 'customer', resInsert.lastInsertRowid, `Created customer profile "${c.name}"`);
  return res.status(201).json({ data: { id: resInsert.lastInsertRowid }, error: null });
});

// POST /api/admin/customers/merge (Merge Duplicate Customers)
router.post('/customers/merge', validateBody(adminSchemas.customerMergeSchema), (req, res) => {
  const { primaryId, secondaryId } = req.body;
  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    return res.status(400).json({ data: null, error: 'Select two distinct customer accounts to merge.' });
  }

  const primary = db.prepare('SELECT * FROM customers WHERE id = ?').get(primaryId);
  const secondary = db.prepare('SELECT * FROM customers WHERE id = ?').get(secondaryId);

  if (!primary || !secondary) {
    return res.status(404).json({ data: null, error: 'One or both customer accounts not found.' });
  }

  // Reassign orders and invoices
  db.transaction(() => {
    db.prepare('UPDATE orders SET guest_email = ? WHERE LOWER(guest_email) = LOWER(?)').run(primary.email, secondary.email);
    db.prepare('UPDATE invoices SET customer_id = ?, customer_email = ? WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)').run(primary.id, primary.email, secondary.id, secondary.email);
    db.prepare('UPDATE estimates SET customer_id = ?, customer_email = ? WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)').run(primary.id, primary.email, secondary.id, secondary.email);
    db.prepare('DELETE FROM customers WHERE id = ?').run(secondary.id);
  })();

  logActivity('update', 'customer', primary.id, `Merged customer ${secondary.name} (${secondary.email}) into ${primary.name}`);
  return res.json({ data: { message: 'Customers merged successfully' }, error: null });
});

export default router;
