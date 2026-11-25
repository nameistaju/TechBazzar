import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { calculateDocumentTotals } from '../../../services/calculation/index.js';
import { logActivity, getNextSequence, getSettingsMap } from '../helpers.js';

const router = Router();

// --- WHOLESALE RFQ / QUOTES INBOX ---

// GET /api/admin/quotes
router.get('/quotes', (req, res) => {
  const quotes = db.prepare('SELECT * FROM quote_requests ORDER BY id DESC').all();
  const formatted = quotes.map(q => {
    let items = [];
    try { items = JSON.parse(q.items); } catch { items = []; }
    return { ...q, items };
  });
  return res.json({ data: { quotes: formatted }, error: null });
});

// PATCH /api/admin/quotes/:id
router.patch('/quotes/:id', validateBody(adminSchemas.quoteUpdateSchema), (req, res) => {
  const { status, notes } = req.body;
  const quote = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ data: null, error: 'Quote request not found' });

  const updates = [];
  const params = [];
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE quote_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(req.params.id);
  return res.json({ data: { quote: updated }, error: null });
});

// POST /api/admin/quotes/:id/convert-to-estimate
router.post('/quotes/:id/convert-to-estimate', (req, res) => {
  const quote = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ data: null, error: 'Quote request not found' });

  let rawItems = [];
  try { rawItems = JSON.parse(quote.items); } catch { rawItems = []; }

  // Map quote items to estimate items
  const estItems = rawItems.map(it => ({
    productId: it.productId || it.id || 'custom-item',
    name: it.name || it.productName || 'Wholesale Product',
    description: it.specs ? JSON.stringify(it.specs) : '',
    quantity: Number(it.quantity) || 10,
    rate: Number(it.targetPrice || it.unitPrice || it.price || 1000),
    discountPercent: 0,
    taxRate: 18
  }));

  const settings = getSettingsMap();
  const estimateNumber = getNextSequence('estimate', settings.estimate_prefix || 'EST-');

  const totals = calculateDocumentTotals({
    items: estItems,
    discountAmount: 0,
    shippingAmount: 0,
    placeOfSupply: 'Karnataka (29)'
  });

  const insertEst = db.prepare(`
    INSERT INTO estimates (
      estimate_number, customer_id, customer_name, customer_email, customer_phone,
      billing_address, estimate_date, valid_until, status, subtotal, discount_amount,
      tax_amount, shipping_amount, round_off, total, amount_in_words, notes, terms
    ) VALUES (
      ?, NULL, ?, ?, ?,
      ?, ?, ?, 'Draft', ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const estRes = insertEst.run(
    estimateNumber,
    quote.business_name || quote.contact_name,
    quote.email,
    quote.phone,
    JSON.stringify({ pincode: quote.pincode }),
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    totals.subtotal,
    totals.discountAmount,
    totals.totalTax,
    totals.shippingAmount,
    totals.roundOff,
    totals.total,
    totals.amountInWords,
    `Converted from ${quote.quote_number}. ${quote.notes || ''}`.trim(),
    settings.invoice_terms || ''
  );

  const estimateId = estRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO estimate_items (
      estimate_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const calcItem of totals.calculatedItems) {
    insertItem.run(
      estimateId,
      calcItem.productId,
      calcItem.name,
      calcItem.description,
      calcItem.quantity,
      calcItem.rate,
      calcItem.discountPercent,
      calcItem.discountAmount,
      calcItem.taxRate,
      calcItem.taxAmount,
      calcItem.lineTotal
    );
  }

  // Update quote request status
  db.prepare('UPDATE quote_requests SET estimate_id = ?, status = ? WHERE id = ?').run(
    estimateId,
    'Quoted',
    quote.id
  );

  logActivity('create', 'estimate', estimateId, `Converted ${quote.quote_number} to estimate ${estimateNumber}`);

  return res.json({
    data: {
      estimateId,
      estimateNumber,
      message: `Quote successfully converted to Estimate ${estimateNumber}`
    },
    error: null
  });
});

export default router;
