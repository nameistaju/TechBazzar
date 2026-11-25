import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody, validateQuery } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { calculateDocumentTotals } from '../../../services/calculation/index.js';
import { logActivity, getNextSequence, getSettingsMap } from '../helpers.js';

const router = Router();

// ==========================================
// 5. ORDERS & FULFILLMENT
// ==========================================

// GET /api/admin/orders
router.get('/orders', validateQuery(adminSchemas.paginationQuerySchema), (req, res) => {
  const { status, paymentMethod, search, from, to, limit = 50 } = req.query;
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (paymentMethod && paymentMethod !== 'all') {
    query += ' AND payment_method = ?';
    params.push(paymentMethod);
  }

  if (search) {
    query += ' AND (order_number LIKE ? OR guest_name LIKE ? OR guest_email LIKE ? OR guest_phone LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (from) {
    query += ' AND DATE(created_at) >= DATE(?)';
    params.push(from);
  }
  if (to) {
    query += ' AND DATE(created_at) <= DATE(?)';
    params.push(to);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(safeLimit);

  const orders = db.prepare(query).all(...params);

  // Attach items count and preview
  const formatted = orders.map(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    return {
      ...o,
      itemsCount: items.reduce((acc, i) => acc + i.quantity, 0),
      itemsPreview: items.map(i => ({ name: i.product_name, quantity: i.quantity, image: i.image }))
    };
  });

  return res.json({ data: { orders: formatted }, error: null });
});

// GET /api/admin/orders/:id
router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ data: null, error: 'Order not found.' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const invoice = db.prepare('SELECT id, invoice_number FROM invoices WHERE order_id = ?').get(order.id);

  return res.json({
    data: {
      order: {
        ...order,
        items,
        statusHistory: order.status_history ? JSON.parse(order.status_history) : [],
        shippingAddress: order.address ? JSON.parse(order.address) : {},
        linkedInvoice: invoice || null
      }
    },
    error: null
  });
});

// PATCH /api/admin/orders/:id
router.patch('/orders/:id', validateBody(adminSchemas.updateOrderSchema), (req, res) => {
  const { status, note, courierName, trackingNumber, internalNotes, paymentStatus } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Order not found.' });
  }

  const updates = [];
  const params = [];

  if (courierName !== undefined) { updates.push('courier_name = ?'); params.push(courierName.trim()); }
  if (trackingNumber !== undefined) { updates.push('tracking_number = ?'); params.push(trackingNumber.trim()); }
  if (internalNotes !== undefined) { updates.push('internal_notes = ?'); params.push(internalNotes); }
  if (paymentStatus !== undefined) { updates.push('payment_status = ?'); params.push(paymentStatus); }

  if (status && status !== existing.status) {
    updates.push('status = ?');
    params.push(status);

    const history = existing.status_history ? JSON.parse(existing.status_history) : [];
    history.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order updated to ${status} by admin.`
    });
    updates.push('status_history = ?');
    params.push(JSON.stringify(history));
  }

  const applyUpdate = db.transaction(() => {
    if (status === 'Cancelled' && existing.status !== 'Cancelled') {
      const linkedInv = db.prepare('SELECT invoice_number FROM invoices WHERE order_id = ?').get(existing.id);
      const alreadyRestored = db.prepare(`
        SELECT id FROM stock_movements
        WHERE reason IN ('return', 'void') AND reference_id IN (?, ?)
        LIMIT 1
      `).get(existing.order_number, linkedInv?.invoice_number || '');

      if (!alreadyRestored) {
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(existing.id);
        for (const item of items) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
          const curStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
          db.prepare(`
            INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
            VALUES (?, ?, ?, ?, 'return', ?, 'Order cancelled - stock restored')
          `).run(item.product_id, item.quantity, curStock.stock - item.quantity, curStock.stock, existing.order_number);
        }
      }
    }

    if (updates.length > 0) {
      db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }
  });

  applyUpdate();
  logActivity('status_change', 'order', req.params.id, `Updated order ${existing.order_number} to ${status || existing.status}`);
  return res.json({ data: { message: 'Order updated successfully' }, error: null });
});

// POST /api/admin/orders/:id/create-invoice (1-Click Invoice Generation from Order)
router.post('/orders/:id/create-invoice', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ data: null, error: 'Order not found.' });

  const existingInv = db.prepare('SELECT id, invoice_number FROM invoices WHERE order_id = ?').get(order.id);
  if (existingInv) {
    return res.json({ data: { invoiceId: existingInv.id, invoiceNumber: existingInv.invoice_number, message: 'Invoice already exists for this order.' }, error: null });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const settings = getSettingsMap();
  const invoiceNumber = getNextSequence('invoice', settings.invoice_prefix || 'INV-2026-');

  const lineItems = items.map(i => ({
    rate: i.price,
    quantity: i.quantity,
    item_name: i.product_name,
    product_id: i.product_id,
    taxRate: 18,
    isTaxInclusive: true
  }));

  const totals = calculateDocumentTotals({
    items: lineItems,
    shippingAmount: order.shipping || 0,
    placeOfSupply: 'Karnataka (29)'
  });

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, order_id, customer_name, customer_email, customer_phone,
      place_of_supply, shipping_address, invoice_date, due_date, payment_terms,
      status, subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount,
      igst_amount, shipping_amount, round_off, total, amount_paid, balance_due,
      amount_in_words, notes, terms
    ) VALUES (
      ?, ?, ?, ?, ?,
      'Karnataka (29)', ?, DATE('now'), DATE('now'), 'Due on receipt',
      'Paid', ?, ?, ?, ?, ?,
      0, ?, ?, ?, ?, 0,
      ?, ?, ?
    )
  `);

  const invRes = insertInv.run(
    invoiceNumber,
    order.id,
    order.guest_name,
    order.guest_email,
    order.guest_phone,
    order.address,
    totals.subtotal,
    order.discount_amount || 0,
    totals.taxableValue,
    totals.cgstAmount,
    totals.sgstAmount,
    order.shipping || 0,
    totals.roundOff,
    order.total,
    order.total,
    totals.amountInWords,
    `Generated automatically from Order ${order.order_number}`,
    settings.invoice_terms || ''
  );

  const invoiceId = invRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, item_name, quantity, rate, line_total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const it of totals.items) {
    insertItem.run(invoiceId, it.product_id, it.item_name, it.quantity, it.rate, it.lineTotal);
  }

  // Record full payment since online order is paid
  db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
    VALUES (?, ?, ?, DATE('now'), ?, 'Order checkout payment')
  `).run(invoiceId, order.total, order.payment_method || 'card', order.order_number);

  logActivity('create', 'invoice', invoiceId, `Created Invoice ${invoiceNumber} from Order ${order.order_number}`);

  return res.json({
    data: {
      invoiceId,
      invoiceNumber,
      message: 'Invoice created successfully'
    },
    error: null
  });
});

// POST /api/admin/orders/manual (Manual telephone / walk-in sales)
router.post('/orders/manual', validateBody(adminSchemas.manualOrderSchema), (req, res) => {
  const { customer, shippingAddress, items, paymentMethod = 'cash', internalNotes } = req.body;
  if (!customer?.name || !items || items.length === 0) {
    return res.status(400).json({ data: null, error: 'Customer name and items are required.' });
  }

  const tx = db.transaction(() => {
    let subtotal = 0;
    const orderItems = [];

    for (const it of items) {
      const prod = db.prepare('SELECT id, name, price, stock, image FROM products WHERE id = ?').get(it.productId);
      if (!prod) throw new Error(`Product ${it.productId} not found.`);
      if (prod.stock < it.quantity) throw new Error(`Insufficient stock for "${prod.name}" (available: ${prod.stock}).`);

      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(it.quantity, prod.id);
      db.prepare(`
        INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, notes)
        VALUES (?, ?, ?, ?, 'sale', 'Walk-in / Telephone manual order')
      `).run(prod.id, -it.quantity, prod.stock, prod.stock - it.quantity);

      subtotal += prod.price * it.quantity;
      orderItems.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: it.quantity,
        image: prod.image
      });
    }

    const orderNumber = `TB-DIR-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const orderRes = db.prepare(`
      INSERT INTO orders (
        order_number, guest_name, guest_email, guest_phone, status,
        status_history, subtotal, shipping, total, address, payment_method,
        payment_status, internal_notes, created_at
      ) VALUES (
        ?, ?, ?, ?, 'Delivered',
        ?, ?, 0, ?, ?, ?,
        'Paid', ?, ?
      )
    `).run(
      orderNumber,
      customer.name,
      customer.email || 'walkin@techbazaar.local',
      customer.phone || '9999999999',
      JSON.stringify([{ status: 'Delivered', timestamp: now, note: 'Direct manual sale completed.' }]),
      subtotal,
      subtotal,
      JSON.stringify(shippingAddress || { line1: 'Store Walk-in', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' }),
      paymentMethod,
      internalNotes || 'Manual walk-in order created by Admin',
      now
    );

    const orderId = orderRes.lastInsertRowid;
    for (const oi of orderItems) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderId, oi.productId, oi.name, oi.price, oi.quantity, oi.image);
    }

    return { orderId, orderNumber, total: subtotal };
  });

  try {
    const result = tx();
    logActivity('create', 'order', result.orderId, `Created manual order ${result.orderNumber} (₹${result.total})`);
    return res.status(201).json({ data: result, error: null });
  } catch (err) {
    return res.status(400).json({ data: null, error: err.message });
  }
});

export default router;
