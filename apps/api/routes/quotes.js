import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const quoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { data: null, error: 'Too many quote requests. Please try again later.' }
});

const createQuoteSchema = z.object({
  businessName: z.string().max(150).optional().nullable(),
  contactName: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(120).optional(),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(10, 'Valid phone number is required').max(20),
  gstin: z.string().max(20).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  items: z.union([
    z.array(z.object({
      productId: z.string().optional(),
      name: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
      targetPrice: z.coerce.number().nonnegative().optional().nullable()
    })).min(1),
    z.string().min(2)
  ]),
  targetPrice: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
}).refine(d => Boolean((d.contactName || d.name || '').trim()), {
  message: 'Contact name is required'
});

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
router.post('/', quoteLimiter, validateBody(createQuoteSchema), (req, res, next) => {
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

// GET /api/quotes/:quoteNumber - Check quote request status (Protected: Admin, Owner, or matching contact)
router.get('/:quoteNumber', quoteLimiter, optionalAuth, (req, res, next) => {
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

    const contactParam = typeof req.query.contact === 'string' ? req.query.contact.trim() : '';
    const isAdmin = req.user?.role === 'admin';
    const isOwner = Boolean(req.user?.email && quote.email && req.user.email.toLowerCase() === quote.email.toLowerCase());
    const hasMatchingContact = Boolean(
      contactParam && (
        (quote.email && contactParam.toLowerCase() === quote.email.toLowerCase()) ||
        (quote.phone && contactParam === quote.phone)
      )
    );

    if (!isAdmin && !isOwner && !hasMatchingContact) {
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
