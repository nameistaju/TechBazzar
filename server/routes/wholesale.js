// server/routes/wholesale.js
// Dedicated backend routes for Wholesale Buyer Ecosystem:
// - Wholesale Business Application & Auto-Approval
// - Server-side Wholesale Cart with Cross-device Sync
// - Server-authoritative Price Validation & Tier Stacking
// - Credit-term Purchases (Net 15/30) & Credit Ledger
// - Saved Named Cart Lists & 1-Click Reorders

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { requireAuth, requireApprovedWholesaleBuyer, generateToken, COOKIE_OPTIONS } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { calculateWholesaleCart, getWholesaleTier, formatINR, numberToWordsIndian } from '../services/calculation.js';

const router = Router();

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { data: null, error: 'Too many application submissions. Please try again later.' }
});

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const wholesaleApplicationSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  contactName: z.string().min(2, 'Contact person name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().email('Valid email address is required'),
  gstin: z.string().optional().refine(val => !val || GSTIN_REGEX.test(val.trim().toUpperCase()), {
    message: 'Invalid 15-character GSTIN format (e.g. 29ABCDE1234F1Z5)'
  }),
  city: z.string().min(2, 'City is required'),
  businessType: z.enum(['shop', 'reseller', 'corporate', 'distributor']),
  expectedMonthlyVolume: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// ==========================================
// 1. PUBLIC: Wholesale Application
// ==========================================

// POST /api/wholesale/apply
router.post('/apply', applyLimiter, validateBody(wholesaleApplicationSchema), (req, res) => {
  const {
    businessName,
    contactName,
    phone,
    email,
    gstin,
    city,
    businessType,
    expectedMonthlyVolume,
    password
  } = req.body;

  const normalizedEmail = email.trim().toLowerCase();
  const cleanedGstin = gstin ? gstin.trim().toUpperCase() : null;

  // Check if email already exists
  const existingUser = db.prepare('SELECT id, role, buyer_type, wholesale_status FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser) {
    if (existingUser.buyer_type === 'wholesale') {
      return res.status(409).json({
        data: null,
        error: `An application with ${normalizedEmail} already exists (Status: ${existingUser.wholesale_status}). Please sign in.`
      });
    }
    return res.status(409).json({
      data: null,
      error: 'An account with this email already exists. Please sign in or contact support to convert your account to wholesale.'
    });
  }

  // Check admin auto-approve setting
  const autoApproveSetting = db.prepare("SELECT value FROM settings WHERE key = 'wholesale_auto_approve_gstin'").get();
  const autoApproveEnabled = autoApproveSetting?.value === 'true';

  let initialStatus = 'pending';
  let assignedGroupId = null;

  // Auto-approve if setting is ON and valid GSTIN provided
  if (autoApproveEnabled && cleanedGstin && GSTIN_REGEX.test(cleanedGstin)) {
    initialStatus = 'approved';
    const silverGroup = db.prepare("SELECT id FROM wholesale_groups WHERE name LIKE '%Silver%' LIMIT 1").get();
    const defaultGroup = db.prepare("SELECT id FROM wholesale_groups ORDER BY id ASC LIMIT 1").get();
    assignedGroupId = silverGroup?.id || defaultGroup?.id || 1;
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const insertUser = db.prepare(`
    INSERT INTO users (
      email, password_hash, name, role, buyer_type, wholesale_status,
      group_id, business_name, gstin, phone, city, business_type, expected_monthly_volume
    ) VALUES (
      ?, ?, ?, 'customer', 'wholesale', ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const userResult = insertUser.run(
    normalizedEmail,
    passwordHash,
    contactName.trim(),
    initialStatus,
    assignedGroupId,
    businessName.trim(),
    cleanedGstin,
    phone.trim(),
    city.trim(),
    businessType,
    expectedMonthlyVolume || '₹1,00,000+'
  );

  const userId = userResult.lastInsertRowid;

  // Record in wholesale_applications table
  db.prepare(`
    INSERT INTO wholesale_applications (
      user_id, business_name, contact_name, phone, email, gstin,
      city, business_type, expected_monthly_volume, status, assigned_group_id,
      reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    businessName.trim(),
    contactName.trim(),
    phone.trim(),
    normalizedEmail,
    cleanedGstin,
    city.trim(),
    businessType,
    expectedMonthlyVolume || '₹1,00,000+',
    initialStatus,
    assignedGroupId,
    initialStatus === 'approved' ? new Date().toISOString() : null
  );

  // If auto-approved, issue token
  let token = null;
  let userData = null;

  if (initialStatus === 'approved') {
    const group = db.prepare('SELECT * FROM wholesale_groups WHERE id = ?').get(assignedGroupId);
    userData = {
      id: userId,
      email: normalizedEmail,
      name: contactName.trim(),
      role: 'customer',
      buyerType: 'wholesale',
      wholesaleStatus: 'approved',
      groupId: assignedGroupId,
      groupName: group?.name || 'Wholesale Buyer',
      extraDiscountPercent: group?.extra_discount_percent || 0,
      creditLimit: group?.credit_limit || 0,
      paymentTerms: group?.payment_terms || 'prepaid',
      businessName: businessName.trim(),
      gstin: cleanedGstin
    };
    token = generateToken(userData);
    res.cookie('token', token, COOKIE_OPTIONS);
  }

  return res.status(201).json({
    data: {
      status: initialStatus,
      isAutoApproved: initialStatus === 'approved',
      user: userData,
      message: initialStatus === 'approved'
        ? `Congratulations! Your GSTIN has been verified and your business account has been approved in tier "${userData.groupName}".`
        : 'Application received. Our B2B onboarding team will review your business credentials and approve your wholesale account shortly.'
    },
    error: null
  });
});

// ==========================================
// 2. WHOLESALE CART ENDPOINTS (Approved Only)
// ==========================================

// Helper: Fetch buyer's full wholesale context & calculate cart
function getBuyerCartSummary(userId, placeOfSupply = 'Karnataka (29)', discountCode = null) {
  const user = db.prepare(`
    SELECT u.id, u.group_id, u.credit_limit_override, wg.name as group_name,
           wg.extra_discount_percent, wg.credit_limit, wg.payment_terms,
           wg.min_order_value, wg.free_shipping_threshold
    FROM users u
    LEFT JOIN wholesale_groups wg ON u.group_id = wg.id
    WHERE u.id = ?
  `).get(userId);

  const cartRows = db.prepare(`
    SELECT wci.id as cart_item_id, wci.product_id, wci.quantity,
           p.id, p.name, p.brand, p.category, p.sku, p.price,
           p.original_price, p.mrp, p.suggested_retail_price, p.moq, p.pack_size,
           p.tier1_qty, p.tier1_price, p.tier2_qty, p.tier2_price,
           p.tier3_qty, p.tier3_price, p.tier4_qty, p.tier4_price,
           p.image, p.stock, p.gst_rate, p.is_tax_inclusive
    FROM wholesale_cart_items wci
    JOIN products p ON wci.product_id = p.id
    WHERE wci.user_id = ?
  `).all(userId);

  // Fetch buyer price lists
  const priceLists = db.prepare('SELECT product_id, custom_price, min_qty FROM price_lists WHERE user_id = ?').all(userId);

  // Fetch discount coupon if provided
  let discountObj = null;
  if (discountCode) {
    discountObj = db.prepare('SELECT * FROM discounts WHERE code = ? AND active = 1').get(discountCode.trim().toUpperCase());
  }

  const group = user?.group_id ? {
    id: user.group_id,
    name: user.group_name,
    extra_discount_percent: user.extra_discount_percent || 0,
    credit_limit: user.credit_limit_override !== null ? user.credit_limit_override : (user.credit_limit || 0),
    payment_terms: user.payment_terms || 'prepaid',
    min_order_value: user.min_order_value ?? 250000,
    free_shipping_threshold: user.free_shipping_threshold ?? 1000000
  } : null;

  const sellerStateRow = db.prepare("SELECT value FROM settings WHERE key = 'business_state'").get();
  const sellerCodeRow = db.prepare("SELECT value FROM settings WHERE key = 'business_state_code'").get();
  const companyState = sellerCodeRow?.value
    ? `${sellerStateRow?.value || 'Karnataka'} (${sellerCodeRow.value})`
    : (sellerStateRow?.value || 'Karnataka (29)');

  return calculateWholesaleCart({
    items: cartRows,
    user,
    group,
    priceLists,
    discount: discountObj,
    placeOfSupply,
    companyState
  });
}

// GET /api/wholesale/cart
router.get('/cart', requireApprovedWholesaleBuyer, (req, res) => {
  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

// POST /api/wholesale/cart (Add item to wholesale cart)
router.post('/cart', requireApprovedWholesaleBuyer, (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ data: null, error: 'Product ID is required' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ data: null, error: 'Product not found in catalog' });

  const moq = Number(product.moq || 10);
  const packSize = Number(product.pack_size || 5);
  const reqQty = quantity !== undefined ? Number(quantity) : moq;

  // Check existing item
  const existing = db.prepare('SELECT quantity FROM wholesale_cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
  const targetQty = existing
    ? existing.quantity + (quantity !== undefined ? reqQty : packSize)
    : Math.max(moq, reqQty);

  if (product.track_inventory !== 0 && !product.allow_backorder && targetQty > Number(product.stock || 0)) {
    return res.status(400).json({ data: null, error: `Insufficient stock for ${product.name}. Only ${product.stock} available.` });
  }

  if (existing) {
    db.prepare('UPDATE wholesale_cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?')
      .run(targetQty, req.user.id, productId);
  } else {
    db.prepare(`
      INSERT INTO wholesale_cart_items (user_id, product_id, quantity)
      VALUES (?, ?, ?)
    `).run(req.user.id, productId, targetQty);
  }

  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

// PATCH /api/wholesale/cart/:productId (Update quantity)
router.patch('/cart/:productId', requireApprovedWholesaleBuyer, (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const qty = Number(quantity);

  if (qty <= 0) {
    db.prepare('DELETE FROM wholesale_cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  } else {
    const product = db.prepare('SELECT id, name, stock, track_inventory, allow_backorder FROM products WHERE id = ? AND deleted_at IS NULL').get(productId);
    if (!product) {
      return res.status(404).json({ data: null, error: 'Product not found.' });
    }
    if (product.track_inventory !== 0 && !product.allow_backorder && qty > Number(product.stock || 0)) {
      return res.status(400).json({ data: null, error: `Insufficient stock for ${product.name}. Only ${product.stock} available.` });
    }
    db.prepare('UPDATE wholesale_cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?')
      .run(qty, req.user.id, productId);
  }

  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

// DELETE /api/wholesale/cart/:productId (Remove item)
router.delete('/cart/:productId', requireApprovedWholesaleBuyer, (req, res) => {
  const { productId } = req.params;
  db.prepare('DELETE FROM wholesale_cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

// DELETE /api/wholesale/cart (Clear wholesale cart)
router.delete('/cart', requireApprovedWholesaleBuyer, (req, res) => {
  db.prepare('DELETE FROM wholesale_cart_items WHERE user_id = ?').run(req.user.id);
  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

// POST /api/wholesale/cart/validate (Server-side re-pricing & validation check)
router.post('/cart/validate', requireApprovedWholesaleBuyer, (req, res) => {
  const { placeOfSupply, discountCode } = req.body;
  const summary = getBuyerCartSummary(req.user.id, placeOfSupply, discountCode);

  // Check if any items exceed current stock
  const stockErrors = [];
  for (const item of summary.items) {
    const prod = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.id || item.product_id);
    if (prod && prod.stock < item.quantity) {
      stockErrors.push(`"${prod.name}": requested ${item.quantity} units, but only ${prod.stock} in warehouse.`);
    }
  }

  return res.json({
    data: {
      ...summary,
      stockErrors,
      isValidForCheckout: summary.meetsMinOrderValue && !summary.hasMoqViolations && stockErrors.length === 0
    },
    error: null
  });
});

// ==========================================
// 3. WHOLESALE ORDERS & CHECKOUT
// ==========================================

const wholesaleOrderSchema = z.object({
  shippingAddress: z.object({
    addressLine: z.string().min(3, 'Address line is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit PIN code is required')
  }),
  billingAddress: z.object({
    addressLine: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional()
  }).optional(),
  paymentMethod: z.enum(['bank_transfer', 'credit_terms', 'card', 'upi', 'advance_50']),
  poNumber: z.string().optional(),
  deliveryNotes: z.string().optional(),
  discountCode: z.string().optional()
});

// Helper: Calculate outstanding credit balance for buyer
function getBuyerCreditStatus(userId) {
  const user = db.prepare(`
    SELECT u.id, u.credit_limit_override, wg.credit_limit as group_credit_limit, wg.payment_terms
    FROM users u
    LEFT JOIN wholesale_groups wg ON u.group_id = wg.id
    WHERE u.id = ?
  `).get(userId);

  const creditLimit = user?.credit_limit_override !== null && user?.credit_limit_override !== undefined
    ? Number(user.credit_limit_override)
    : Number(user?.group_credit_limit || 0);

  // Outstanding unpaid invoices
  const unpaidRow = db.prepare(`
    SELECT COALESCE(SUM(balance_due), 0) as outstanding
    FROM invoices
    WHERE customer_id = ? AND status IN ('unpaid', 'partially_paid', 'issued')
  `).get(userId);

  const outstanding = unpaidRow ? Number(unpaidRow.outstanding) : 0;
  const availableCredit = Math.max(0, creditLimit - outstanding);

  return {
    creditLimit,
    outstanding,
    availableCredit,
    paymentTerms: user?.payment_terms || 'prepaid'
  };
}

// GET /api/wholesale/credit
router.get('/credit', requireApprovedWholesaleBuyer, (req, res) => {
  const creditStatus = getBuyerCreditStatus(req.user.id);
  const ledger = db.prepare('SELECT * FROM credit_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.user.id);
  return res.json({
    data: {
      ...creditStatus,
      ledger
    },
    error: null
  });
});

// POST /api/wholesale/orders (Place B2B Wholesale Order)
router.post('/orders', requireApprovedWholesaleBuyer, validateBody(wholesaleOrderSchema), (req, res) => {
  const { shippingAddress, billingAddress, paymentMethod, poNumber, deliveryNotes, discountCode } = req.body;
  const userId = req.user.id;

  const summary = getBuyerCartSummary(userId, shippingAddress.state, discountCode);

  if (summary.items.length === 0) {
    return res.status(400).json({ data: null, error: 'Your wholesale cart is empty.' });
  }

  if (!summary.meetsMinOrderValue) {
    return res.status(400).json({
      data: null,
      error: `Minimum wholesale order value of ${formatINR(summary.minOrderValue)} required (current cart: ${formatINR(summary.subtotal)}).`
    });
  }

  if (summary.hasMoqViolations) {
    return res.status(400).json({
      data: null,
      error: 'Some items in your cart do not meet their wholesale Minimum Order Quantity (MOQ).'
    });
  }

  // Credit terms validation
  const isCreditOrder = paymentMethod === 'credit_terms';
  const creditStatus = getBuyerCreditStatus(userId);

  if (isCreditOrder) {
    if (creditStatus.paymentTerms === 'prepaid' || creditStatus.creditLimit <= 0) {
      return res.status(400).json({
        data: null,
        error: 'Your wholesale tier does not permit credit terms. Please use Direct Bank Transfer or Advance Booking.'
      });
    }

    if (summary.total > creditStatus.availableCredit) {
      return res.status(400).json({
        data: null,
        error: `Order total (${formatINR(summary.total)}) exceeds your available credit line (${formatINR(creditStatus.availableCredit)}). Available credit: ${formatINR(creditStatus.availableCredit)} of ${formatINR(creditStatus.creditLimit)} limit.`
      });
    }
  }

  const is50PercentAdvance = paymentMethod === 'advance_50';
  const advanceAmount = is50PercentAdvance ? Math.round(summary.total / 2) : (paymentMethod === 'bank_transfer' ? summary.total : (isCreditOrder ? 0 : summary.total));
  const balanceDue = summary.total - advanceAmount;

  try {
    const executeOrder = db.transaction(() => {
      // 1. Check stock and decrement
      for (const item of summary.items) {
        const prod = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.id || item.product_id);
        if (prod.stock < item.quantity) {
          throw new Error(`Insufficient warehouse stock for "${prod.name}" (only ${prod.stock} units available, requested ${item.quantity}).`);
        }
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id || item.product_id);
      }

      // 2. Generate unique order number
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const orderNumber = `TB-WS-${new Date().getFullYear()}-${randomSuffix}`;
      const trackingToken = Math.random().toString(36).substring(2, 10).toUpperCase();

      const fullShipping = `${shippingAddress.addressLine}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`;
      const fullBilling = billingAddress?.addressLine 
        ? `${billingAddress.addressLine}, ${billingAddress.city}, ${billingAddress.state} - ${billingAddress.pincode}`
        : fullShipping;

      const initialStatusHistory = JSON.stringify([
        {
          status: 'Confirmed',
          timestamp: new Date().toISOString(),
          comment: 'B2B Wholesale Order placed'
        }
      ]);

      // 3. Insert order record
      const orderResult = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, guest_name, guest_email, guest_phone,
          tracking_token, status, status_history, subtotal, shipping, total,
          address, billing_address, payment_method, business_name, gstin,
          advance_amount, balance_amount, is_advance_payment, channel, group_id,
          po_number, delivery_notes, credit_terms, discount_code, discount_amount,
          payment_status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, 'Confirmed', ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, 'wholesale', ?,
          ?, ?, ?, ?, ?,
          ?
        )
      `).run(
        orderNumber,
        userId,
        req.user.name,
        req.user.email,
        req.user.phone || '9876543210',
        trackingToken,
        initialStatusHistory,
        summary.subtotal,
        summary.shipping,
        summary.total,
        fullShipping,
        fullBilling,
        paymentMethod,
        req.user.business_name || 'B2B Enterprise',
        req.user.gstin || null,
        advanceAmount,
        balanceDue,
        is50PercentAdvance ? 1 : 0,
        req.user.group_id || null,
        poNumber || null,
        deliveryNotes || null,
        isCreditOrder ? creditStatus.paymentTerms : null,
        discountCode || null,
        summary.totalDiscount || 0,
        isCreditOrder ? 'credit_issued' : (is50PercentAdvance ? 'partially_paid' : 'paid')
      );

      const orderId = orderResult.lastInsertRowid;

      // 4. Insert order items
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, price, quantity,
          image, tier_applied, unit_price, tax_rate, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of summary.items) {
        insertOrderItem.run(
          orderId,
          item.id || item.product_id,
          item.name,
          item.unitPrice,
          item.quantity,
          item.image,
          item.tierApplied || 1,
          item.unitPrice,
          item.taxRate || 18,
          item.taxAmount || 0
        );
      }

      // 5. Look up or create CRM Customer record for B2B buyer
      let cRow = db.prepare('SELECT id FROM customers WHERE user_id = ? OR LOWER(email) = ?').get(userId, req.user.email.toLowerCase());
      let customerId = cRow?.id || null;
      if (!customerId) {
        const cInsert = db.prepare(`
          INSERT INTO customers (name, email, phone, user_id, gstin, company, billing_address, shipping_address, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, '["wholesale"]')
        `).run(
          req.user.name,
          req.user.email.toLowerCase(),
          req.user.phone || null,
          userId,
          req.user.gstin || null,
          req.user.business_name || null,
          fullBilling,
          fullShipping
        );
        customerId = cInsert.lastInsertRowid;
      }

      // Auto-generate B2B GST Tax Invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const dueDate = new Date();
      if (isCreditOrder) {
        const days = creditStatus.paymentTerms === 'net_60' ? 60 : (creditStatus.paymentTerms === 'net_30' ? 30 : 15);
        dueDate.setDate(dueDate.getDate() + days);
      } else {
        dueDate.setDate(dueDate.getDate() + 3);
      }

      const invoiceResult = db.prepare(`
        INSERT INTO invoices (
          invoice_number, order_id, customer_id, customer_name, customer_email,
          customer_phone, customer_gstin, place_of_supply, billing_address, shipping_address,
          invoice_date, due_date, payment_terms, status, subtotal,
          discount_amount, taxable_value, cgst_amount, sgst_amount, igst_amount,
          shipping_amount, round_off, total, amount_paid, balance_due,
          amount_in_words, notes, terms, channel, invoice_type
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, 'wholesale', 'gst'
        )
      `).run(
        invoiceNumber,
        orderId,
        customerId,
        req.user.business_name || req.user.name,
        req.user.email,
        req.user.phone || '9876543210',
        req.user.gstin || null,
        shippingAddress.state,
        fullBilling,
        fullShipping,
        dueDate.toISOString(),
        isCreditOrder ? creditStatus.paymentTerms.toUpperCase() : 'IMMEDIATE',
        isCreditOrder ? 'unpaid' : (is50PercentAdvance ? 'partially_paid' : 'paid'),
        summary.subtotal,
        summary.totalDiscount,
        summary.taxableValue,
        summary.cgstAmount,
        summary.sgstAmount,
        summary.igstAmount,
        summary.shipping,
        summary.roundOff,
        summary.total,
        advanceAmount,
        balanceDue,
        numberToWordsIndian(summary.total),
        `Wholesale procurement order ${orderNumber}. Group tier: ${req.user.group_name || 'Standard'}.`,
        '100% genuine warranty. Subject to Bangalore jurisdiction. E.&O.E.'
      );

      const invoiceId = invoiceResult.lastInsertRowid;

      // Link invoice to order
      db.prepare('UPDATE orders SET invoice_id = ? WHERE id = ?').run(invoiceId, orderId);

      // 6. Record in Credit Ledger if credit terms used
      if (isCreditOrder) {
        const newBalance = creditStatus.outstanding + summary.total;
        db.prepare(`
          INSERT INTO credit_ledger (user_id, invoice_id, entry_type, amount, balance_after, notes)
          VALUES (?, ?, 'invoice', ?, ?, ?)
        `).run(userId, invoiceId, summary.total, newBalance, `Credit order ${orderNumber} under ${creditStatus.paymentTerms.toUpperCase()}`);
      }

      // 7. Clear wholesale cart items
      db.prepare('DELETE FROM wholesale_cart_items WHERE user_id = ?').run(userId);

      return {
        orderId,
        orderNumber,
        invoiceNumber,
        invoiceId,
        total: summary.total,
        advanceAmount,
        balanceDue,
        isCreditOrder,
        paymentTerms: creditStatus.paymentTerms
      };
    });

    const result = executeOrder();
    return res.status(201).json({
      data: {
        order: result,
        message: 'Wholesale order confirmed and B2B GST tax invoice generated.'
      },
      error: null
    });
  } catch (err) {
    return res.status(400).json({ data: null, error: err.message });
  }
});

// ==========================================
// 4. SAVED LISTS & REORDER
// ==========================================

// GET /api/wholesale/saved-lists
router.get('/saved-lists', requireApprovedWholesaleBuyer, (req, res) => {
  const lists = db.prepare('SELECT * FROM saved_lists WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const parsed = lists.map(l => ({ ...l, items: JSON.parse(l.items) }));
  return res.json({ data: parsed, error: null });
});

// POST /api/wholesale/saved-lists
router.post('/saved-lists', requireApprovedWholesaleBuyer, (req, res) => {
  const { name } = req.body;
  const summary = getBuyerCartSummary(req.user.id);

  if (summary.items.length === 0) {
    return res.status(400).json({ data: null, error: 'Cannot save an empty cart.' });
  }

  const listId = `list-${Date.now()}`;
  const listName = name || `Wholesale List (${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})`;

  db.prepare(`
    INSERT INTO saved_lists (id, user_id, name, items, item_count, total_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    listId,
    req.user.id,
    listName,
    JSON.stringify(summary.items),
    summary.items.reduce((sum, it) => sum + it.quantity, 0),
    summary.total
  );

  return res.status(201).json({ data: { listId, name: listName }, error: null });
});

// POST /api/wholesale/saved-lists/:listId/load
router.post('/saved-lists/:listId/load', requireApprovedWholesaleBuyer, (req, res) => {
  const { listId } = req.params;
  const list = db.prepare('SELECT * FROM saved_lists WHERE id = ? AND user_id = ?').get(listId, req.user.id);
  if (!list) return res.status(404).json({ data: null, error: 'Saved list not found' });

  const items = JSON.parse(list.items);
  const insertStmt = db.prepare(`
    INSERT INTO wholesale_cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity
  `);

  db.transaction(() => {
    for (const it of items) {
      insertStmt.run(req.user.id, it.id || it.product_id, it.quantity);
    }
  })();

  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

// POST /api/wholesale/reorder/:orderNumber
router.post('/reorder/:orderNumber', requireApprovedWholesaleBuyer, (req, res) => {
  const { orderNumber } = req.params;
  const order = db.prepare('SELECT id FROM orders WHERE order_number = ? AND user_id = ?').get(orderNumber, req.user.id);
  if (!order) return res.status(404).json({ data: null, error: 'Order not found' });

  const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
  const insertStmt = db.prepare(`
    INSERT INTO wholesale_cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity
  `);

  db.transaction(() => {
    for (const it of items) {
      insertStmt.run(req.user.id, it.product_id, it.quantity);
    }
  })();

  const summary = getBuyerCartSummary(req.user.id);
  return res.json({ data: summary, error: null });
});

export default router;
