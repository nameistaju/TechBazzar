import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

function getNextRfqNumber() {
  const currentYear = new Date().getFullYear();
  const row = db.prepare(`
    SELECT quote_number FROM quote_requests 
    WHERE quote_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`RFQ-${currentYear}-%`);

  let seq = 1;
  if (row && row.quote_number) {
    const parts = row.quote_number.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) seq = lastNum + 1;
  }
  return `RFQ-${currentYear}-${String(seq).padStart(4, '0')}`;
}

// POST /api/quotes - Submit new quote request (guest or registered)
router.post('/', (req, res, next) => {
  try {
    const {
      businessName,
      contactName: rawContactName,
      name,
      email,
      phone,
      gstin,
      pincode,
      items,
      targetPrice,
      notes
    } = req.body;

    const contactName = rawContactName || name;

    if (!contactName || !email || !phone) {
      return res.status(400).json({ data: null, error: 'Contact name, email, and phone are required' });
    }

    if (!items || (Array.isArray(items) && items.length === 0)) {
      return res.status(400).json({ data: null, error: 'At least one item is required in the quote request' });
    }

    const quoteNumber = getNextRfqNumber();
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
    const targetPriceInt = targetPrice ? Math.round(Number(targetPrice)) : null;

    const result = db.prepare(`
      INSERT INTO quote_requests (
        quote_number, status, business_name, contact_name, email,
        phone, gstin, pincode, items, target_price, notes
      ) VALUES (?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      quoteNumber,
      businessName || null,
      contactName.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      gstin ? gstin.trim().toUpperCase() : null,
      pincode ? pincode.trim() : null,
      itemsJson,
      targetPriceInt,
      notes || null
    );

    res.status(201).json({
      data: {
        id: result.lastInsertRowid,
        quoteNumber,
        status: 'Pending',
        message: 'Your wholesale quote request has been received. Our sales desk will reply within 4 business hours.'
      },
      error: null
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quotes/:quoteNumber - Check quote request status
router.get('/:quoteNumber', (req, res, next) => {
  try {
    const { quoteNumber } = req.params;
    const quote = db.prepare(`
      SELECT quote_number, status, business_name, contact_name, email,
             phone, gstin, pincode, items, target_price, notes, created_at
      FROM quote_requests
      WHERE quote_number = ?
    `).get(quoteNumber);

    if (!quote) {
      return res.status(404).json({ data: null, error: 'Quote request not found' });
    }

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(quote.items);
    } catch {
      parsedItems = [];
    }

    res.json({
      data: {
        ...quote,
        items: parsedItems
      },
      error: null
    });
  } catch (err) {
    next(err);
  }
});

export default router;
