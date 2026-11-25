import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { calculateDocumentTotals } from '../../../services/calculation/index.js';
import { generateDocumentPDF } from '../../../services/pdfGenerator.js';
import { logActivity, getNextSequence, getSettingsMap } from '../helpers.js';

const router = Router();

// ==========================================
// 7. ESTIMATES (QUOTATIONS)
// ==========================================

// GET /api/admin/estimates
router.get('/estimates', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM estimates WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (estimate_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const estimates = db.prepare(query).all(...params);
  return res.json({ data: { estimates }, error: null });
});

// GET /api/admin/estimates/:id
router.get('/estimates/:id', (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).json({ data: null, error: 'Estimate not found.' });

  const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(est.id);
  return res.json({
    data: {
      estimate: {
        ...est,
        billingAddress: est.billing_address ? JSON.parse(est.billing_address) : {},
        items
      }
    },
    error: null
  });
});

// POST /api/admin/estimates
router.post('/estimates', validateBody(adminSchemas.documentCreateSchema), (req, res) => {
  const { customer, items, estimateDate, validUntil, notes, terms, discountAmount, shippingAmount } = req.body;
  if (!customer?.name || !items || items.length === 0) {
    return res.status(400).json({ data: null, error: 'Customer name and line items are required.' });
  }

  const settings = getSettingsMap();
  const estimateNumber = getNextSequence('estimate', settings.estimate_prefix || 'EST-');

  const totals = calculateDocumentTotals({
    items,
    discountAmount: Number(discountAmount) || 0,
    shippingAmount: Number(shippingAmount) || 0,
    placeOfSupply: 'Karnataka (29)'
  });

  const insertEst = db.prepare(`
    INSERT INTO estimates (
      estimate_number, customer_id, customer_name, customer_email, customer_phone,
      billing_address, estimate_date, valid_until, status, subtotal, discount_amount,
      tax_amount, shipping_amount, round_off, total, amount_in_words, notes, terms
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'Draft', ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const estRes = insertEst.run(
    estimateNumber,
    customer.id || null,
    customer.name.trim(),
    customer.email ? customer.email.trim() : null,
    customer.phone ? customer.phone.trim() : null,
    JSON.stringify(customer.billingAddress || {}),
    estimateDate || new Date().toISOString().split('T')[0],
    validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    totals.subtotal,
    totals.discountAmount,
    totals.totalTax,
    totals.shippingAmount,
    totals.roundOff,
    totals.total,
    totals.amountInWords,
    notes || settings.invoice_notes || '',
    terms || settings.invoice_terms || ''
  );

  const estimateId = estRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO estimate_items (
      estimate_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of totals.items) {
    insertItem.run(
      estimateId,
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
  }

  logActivity('create', 'estimate', estimateId, `Created Estimate ${estimateNumber} for ${customer.name}`);
  return res.status(201).json({ data: { id: estimateId, estimateNumber }, error: null });
});

// POST /api/admin/estimates/:id/convert-to-invoice (1-Click Quotation -> Invoice Conversion)
router.post('/estimates/:id/convert-to-invoice', (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).json({ data: null, error: 'Estimate not found.' });

  if (est.converted_invoice_id) {
    return res.json({ data: { invoiceId: est.converted_invoice_id, message: 'Estimate was already converted.' }, error: null });
  }

  const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(est.id);
  const settings = getSettingsMap();
  const invoiceNumber = getNextSequence('invoice', settings.invoice_prefix || 'INV-2026-');

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, estimate_id, customer_id, customer_name, customer_email, customer_phone,
      place_of_supply, billing_address, invoice_date, due_date, payment_terms,
      status, subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount,
      igst_amount, shipping_amount, round_off, total, amount_paid, balance_due,
      amount_in_words, notes, terms
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      'Karnataka (29)', ?, DATE('now'), DATE('now', '+7 days'), 'Net 7',
      'Unpaid', ?, ?, ?, ?, ?,
      0, ?, ?, ?, 0, ?,
      ?, ?, ?
    )
  `);

  const invRes = insertInv.run(
    invoiceNumber,
    est.id,
    est.customer_id,
    est.customer_name,
    est.customer_email,
    est.customer_phone,
    est.billing_address,
    est.subtotal,
    est.discount_amount,
    est.subtotal - est.discount_amount,
    Math.round(est.tax_amount / 2),
    est.tax_amount - Math.round(est.tax_amount / 2),
    est.shipping_amount,
    est.round_off,
    est.total,
    est.total,
    est.amount_in_words,
    `Converted from Quotation ${est.estimate_number}`,
    est.terms
  );

  const invoiceId = invRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (
      invoice_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      invoiceId,
      it.product_id,
      it.item_name,
      it.description,
      it.quantity,
      it.rate,
      it.discount_percent,
      it.discount_amount,
      it.tax_rate,
      it.tax_amount,
      it.line_total
    );

    // Auto-decrement inventory if product_id exists and is found in products
    if (it.product_id) {
      const cur = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
      if (cur) {
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.quantity, it.product_id);
        const curAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'invoice', ?, 'Estimate converted to invoice')
        `).run(it.product_id, -it.quantity, cur.stock, curAfter.stock, invoiceNumber);
      }
    }
  }

  // Mark estimate as Accepted & link converted invoice
  db.prepare("UPDATE estimates SET status = 'Accepted', converted_invoice_id = ? WHERE id = ?").run(invoiceId, est.id);

  logActivity('create', 'invoice', invoiceId, `Converted Estimate ${est.estimate_number} to Invoice ${invoiceNumber}`);
  return res.json({ data: { invoiceId, invoiceNumber }, error: null });
});

// GET /api/admin/estimates/:id/pdf
router.get('/estimates/:id/pdf', async (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).send('Estimate not found');

  const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(est.id);
  const settings = getSettingsMap();

  try {
    const pdfBuffer = await generateDocumentPDF({ ...est, items }, settings, 'estimate');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${est.estimate_number}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    return res.status(500).send('Error generating PDF');
  }
});

export default router;
