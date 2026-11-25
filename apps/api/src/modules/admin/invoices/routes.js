import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { formatMoney, calculateDocumentTotals } from '../../../services/calculation/index.js';
import { generateDocumentPDF } from '../../../services/pdfGenerator.js';
import { logActivity, getNextSequence, getSettingsMap } from '../helpers.js';

const router = Router();

// ==========================================
// 8. INVOICES (BILLING)
// ==========================================

// GET /api/admin/invoices
router.get('/invoices', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const invoices = db.prepare(query).all(...params);
  return res.json({ data: { invoices }, error: null });
});

// GET /api/admin/invoices/:id
router.get('/invoices/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ data: null, error: 'Invoice not found.' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(inv.id);

  return res.json({
    data: {
      invoice: {
        ...inv,
        billingAddress: inv.billing_address ? JSON.parse(inv.billing_address) : {},
        shippingAddress: inv.shipping_address ? JSON.parse(inv.shipping_address) : {},
        items,
        payments
      }
    },
    error: null
  });
});

// POST /api/admin/invoices
router.post('/invoices', validateBody(adminSchemas.documentCreateSchema), (req, res) => {
  const { customer, items, invoiceDate, dueDate, paymentTerms, placeOfSupply, notes, terms, discountAmount, shippingAmount, template } = req.body;
  if (!customer?.name || !items || items.length === 0) {
    return res.status(400).json({ data: null, error: 'Customer name and line items are required.' });
  }

  const settings = getSettingsMap();
  const invoiceNumber = getNextSequence('invoice', settings.invoice_prefix || 'INV-2026-');

  const totals = calculateDocumentTotals({
    items,
    discountAmount: Number(discountAmount) || 0,
    shippingAmount: Number(shippingAmount) || 0,
    placeOfSupply: placeOfSupply || 'Karnataka (29)',
    companyState: settings.business_state ? `${settings.business_state} (${settings.business_state_code || '29'})` : 'Karnataka (29)'
  });

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, customer_id, customer_name, customer_email, customer_phone,
      customer_gstin, place_of_supply, billing_address, shipping_address,
      invoice_date, due_date, payment_terms, status, subtotal, discount_amount,
      taxable_value, cgst_amount, sgst_amount, igst_amount, shipping_amount,
      round_off, total, amount_paid, balance_due, amount_in_words, notes, terms, template
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, 'Unpaid', ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, 0, ?, ?, ?, ?, ?
    )
  `);

  const invRes = insertInv.run(
    invoiceNumber,
    customer.id || null,
    customer.name.trim(),
    customer.email ? customer.email.trim() : null,
    customer.phone ? customer.phone.trim() : null,
    customer.gstin ? customer.gstin.trim() : null,
    placeOfSupply || 'Karnataka (29)',
    JSON.stringify(customer.billingAddress || {}),
    JSON.stringify(customer.shippingAddress || {}),
    invoiceDate || new Date().toISOString().split('T')[0],
    dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentTerms || 'Due on receipt',
    totals.subtotal,
    totals.discountAmount,
    totals.taxableValue,
    totals.cgstAmount,
    totals.sgstAmount,
    totals.igstAmount,
    totals.shippingAmount,
    totals.roundOff,
    totals.total,
    totals.total,
    totals.amountInWords,
    notes || settings.invoice_notes || '',
    terms || settings.invoice_terms || '',
    template || 'standard'
  );

  const invoiceId = invRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (
      invoice_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of totals.items) {
    insertItem.run(
      invoiceId,
      it.product_id || null,
      it.item_name || 'Line Item',
      it.description || '',
      it.quantity,
      it.rate,
      it.discountPercent || 0,
      it.discountAmount || 0,
      it.taxRate || 18,
      it.taxAmount || 0,
      it.lineTotal
    );

    // Auto-decrement inventory if product_id exists and is found in products
    if (it.product_id) {
      const cur = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
      if (cur) {
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.quantity, it.product_id);
        const curAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'invoice', ?, 'Invoice line item deduction')
        `).run(it.product_id, -it.quantity, cur.stock, curAfter.stock, invoiceNumber);
      }
    }
  }

  logActivity('create', 'invoice', invoiceId, `Created Invoice ${invoiceNumber} (₹${totals.total}) for ${customer.name}`);
  return res.status(201).json({ data: { id: invoiceId, invoiceNumber }, error: null });
});

// POST /api/admin/invoices/:id/payments (Record Partial or Full Payment)
router.post('/invoices/:id/payments', validateBody(adminSchemas.recordPaymentSchema), (req, res) => {
  const { amount, paymentMethod, paymentDate, referenceNumber, notes } = req.body;
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ data: null, error: 'Invoice not found.' });

  const payAmt = Number(amount);
  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ data: null, error: 'Payment amount must be greater than 0.' });
  }

  const insertPay = db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertPay.run(
    inv.id,
    payAmt,
    paymentMethod || 'bank_transfer',
    paymentDate || new Date().toISOString().split('T')[0],
    referenceNumber || null,
    notes || null
  );

  const newPaid = inv.amount_paid + payAmt;
  const newBalance = Math.max(0, inv.total - newPaid);
  const newStatus = newBalance === 0 ? 'Paid' : 'Partially paid';

  db.prepare(`
    UPDATE invoices
    SET amount_paid = ?, balance_due = ?, status = ?
    WHERE id = ?
  `).run(newPaid, newBalance, newStatus, inv.id);

  logActivity('update', 'invoice', inv.id, `Recorded payment of ${formatMoney(payAmt)} for Invoice ${inv.invoice_number} (Balance: ${formatMoney(newBalance)})`);
  return res.json({ data: { amountPaid: newPaid, balanceDue: newBalance, status: newStatus }, error: null });
});

// POST /api/admin/invoices/:id/void (Void Invoice with Stock Restoration)
router.post('/invoices/:id/void', validateBody(adminSchemas.voidInvoiceSchema), (req, res) => {
  const { voidReason } = req.body;
  if (!voidReason) {
    return res.status(400).json({ data: null, error: 'Void reason is required.' });
  }

  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ data: null, error: 'Invoice not found.' });

  if (inv.status === 'Void') {
    return res.status(400).json({ data: null, error: 'Invoice is already void.' });
  }

  const voidTx = db.transaction(() => {
    const linkedOrder = inv.order_id
      ? db.prepare('SELECT id, order_number, status FROM orders WHERE id = ?').get(inv.order_id)
      : null;

    const alreadyRestored = (linkedOrder && linkedOrder.status === 'Cancelled') || Boolean(
      db.prepare(`
        SELECT id FROM stock_movements
        WHERE reason IN ('return', 'void') AND reference_id IN (?, ?)
        LIMIT 1
      `).get(inv.invoice_number, linkedOrder?.order_number || '')
    );

    if (!alreadyRestored) {
      const items = db.prepare('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?').all(inv.id);
      for (const it of items) {
        if (it.product_id) {
          const cur = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
          if (cur) {
            db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.quantity, it.product_id);
            const curAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
            db.prepare(`
              INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
              VALUES (?, ?, ?, ?, 'void', ?, 'Invoice voided - stock restored')
            `).run(it.product_id, it.quantity, cur.stock, curAfter.stock, inv.invoice_number);
          }
        }
      }
    }

    db.prepare("UPDATE invoices SET status = 'Void', void_reason = ? WHERE id = ?").run(voidReason, inv.id);
  });

  voidTx();
  logActivity('void', 'invoice', inv.id, `Voided Invoice ${inv.invoice_number} (${voidReason})`);

  return res.json({ data: { message: 'Invoice voided and inventory restored.' }, error: null });
});

// GET /api/admin/invoices/:id/pdf
router.get('/invoices/:id/pdf', async (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).send('Invoice not found');

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  const settings = getSettingsMap();

  try {
    const pdfBuffer = await generateDocumentPDF({ ...inv, items }, settings, 'invoice');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.invoice_number}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    return res.status(500).send('Error generating PDF');
  }
});

export default router;
