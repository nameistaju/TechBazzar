import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { formatProduct } from './products.js';
import { evaluateDiscount } from '../services/calculation.js';

const router = Router();

const validateCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive().default(1),
    clientPrice: z.number().optional()
  }))
});

const syncCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  }))
});

const syncWishlistSchema = z.object({
  productIds: z.array(z.string())
});

// POST /api/cart/validate (Public / Retail - checks guest or user cart against live DB)
router.post('/validate', validateBody(validateCartSchema), (req, res) => {
  const { items } = req.body;
  const validatedItems = [];
  const warnings = [];
  let subtotal = 0;

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);

    if (!product) {
      warnings.push(`One of your items (${item.productId}) is no longer available in catalog.`);
      continue;
    }

    if (product.stock <= 0) {
      warnings.push(`"${product.name}" is currently out of stock.`);
      continue;
    }

    let actualQty = Math.max(1, item.quantity);
    if (actualQty > product.stock) {
      actualQty = product.stock;
      warnings.push(`Only ${product.stock} units of "${product.name}" available. Cart quantity adjusted.`);
    }

    const unitPrice = Number(product.price || 0);
    const itemTotal = unitPrice * actualQty;
    subtotal += itemTotal;

    const mrp = Number(product.mrp || product.original_price || Math.round(unitPrice * 1.3));

    validatedItems.push({
      product: formatProduct(product),
      quantity: actualQty,
      price: unitPrice,
      total: itemTotal,
      savingsVsMrp: Math.max(0, (mrp * actualQty) - itemTotal)
    });
  }

  return res.json({
    data: {
      valid: warnings.length === 0,
      items: validatedItems,
      subtotal,
      warnings
    },
    error: null
  });
});

// POST /api/cart/apply-discount (Retail/Wholesale Cart Coupon Evaluation)
router.post('/apply-discount', optionalAuth, (req, res) => {
  const { code, items, channel } = req.body;
  const targetChannel = channel === 'wholesale' ? 'wholesale' : 'retail';
  if (!code || !code.trim()) {
    return res.status(400).json({ data: null, error: 'Discount code is required.' });
  }

  const discount = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?) AND active = 1').get(code.trim());
  if (!discount) {
    return res.status(404).json({ data: null, error: 'Invalid or expired coupon code.' });
  }

  // Populate actual items from DB
  const resolvedItems = (items || []).map(it => {
    const prod = db.prepare('SELECT id, name, category, brand, price FROM products WHERE id = ?').get(it.productId || it.id);
    return {
      id: it.productId || it.id,
      name: prod?.name || 'Product',
      price: prod ? prod.price : (it.price || 0),
      quantity: Number(it.quantity) || 1,
      category: prod ? prod.category : (it.category || 'general'),
      brand: prod ? prod.brand : (it.brand || 'TechBazaar')
    };
  });

  const evaluation = evaluateDiscount(discount, { items: resolvedItems }, req.user, targetChannel);
  if (!evaluation.valid) {
    return res.status(400).json({ data: null, error: evaluation.reason });
  }

  return res.json({
    data: {
      valid: true,
      code: discount.code,
      title: discount.title,
      discountAmount: evaluation.discountAmount,
      savingsText: evaluation.savingsText
    },
    error: null
  });
});

// GET /api/cart (Auth-only)
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.quantity, p.*
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `).all(req.user.id);

  const items = rows.map(r => ({
    product: formatProduct(r),
    quantity: r.quantity
  }));

  return res.json({
    data: { items },
    error: null
  });
});

// POST /api/cart/sync (Auth-only - merge guest cart to DB)
router.post('/sync', requireAuth, validateBody(syncCartSchema), (req, res) => {
  const { items } = req.body;
  
  const upsert = db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET
      quantity = cart_items.quantity + excluded.quantity
  `);

  const syncTx = db.transaction((lines) => {
    for (const line of lines) {
      // Check product exists
      const exists = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(line.productId);
      if (exists && exists.stock > 0) {
        upsert.run(req.user.id, line.productId, Math.min(line.quantity, exists.stock));
      }
    }
  });

  syncTx(items);

  // Return refreshed cart
  const rows = db.prepare(`
    SELECT c.quantity, p.*
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `).all(req.user.id);

  return res.json({
    data: {
      items: rows.map(r => ({
        product: formatProduct(r),
        quantity: r.quantity
      }))
    },
    error: null
  });
});

// GET /api/wishlist (Auth-only)
router.get('/wishlist', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT product_id FROM wishlist_items WHERE user_id = ?
  `).all(req.user.id);

  return res.json({
    data: {
      productIds: rows.map(r => r.product_id)
    },
    error: null
  });
});

// POST /api/wishlist/sync (Auth-only)
router.post('/wishlist/sync', requireAuth, validateBody(syncWishlistSchema), (req, res) => {
  const { productIds } = req.body;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO wishlist_items (user_id, product_id)
    VALUES (?, ?)
  `);

  const syncTx = db.transaction((ids) => {
    for (const pid of ids) {
      insert.run(req.user.id, pid);
    }
  });

  syncTx(productIds);

  const refreshed = db.prepare(`
    SELECT product_id FROM wishlist_items WHERE user_id = ?
  `).all(req.user.id);

  return res.json({
    data: {
      productIds: refreshed.map(r => r.product_id)
    },
    error: null
  });
});

export default router;
