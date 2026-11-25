import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import PaymentService from '../services/payment.js';
import { evaluateDiscount, getWholesaleTier, isIntraStateSupply, numberToWordsIndian, formatMoney } from '../services/calculation.js';
import { generateDocumentPDF } from '../services/pdfGenerator.js';

const router = Router();

// Rate limiter for order placement: max 15 requests per 10 minutes per IP
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { data: null, error: 'Too many order requests. Please try again in a few minutes.' }
});

const trackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { data: null, error: 'Too many tracking requests. Please try again later.' }
});

const invoiceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { data: null, error: 'Too many invoice requests. Please try again later.' }
});

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid 10-digit phone number is required'),
    businessName: z.string().optional(),
    gstin: z.string().optional()
  }),
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
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  })).min(1, 'Order must contain at least one item'),
  paymentMethod: z.enum(['cod', 'card', 'upi', 'bank_transfer', 'credit_terms', 'advance_50']).default('card'),
  discountCode: z.string().optional(),
  isAdvancePayment: z.boolean().optional(),
  channel: z.enum(['retail', 'wholesale']).default('retail')
});

const trackOrderSchema = z.object({
  orderNumber: z.string().optional(),
  contact: z.string().optional(), // email or phone
  trackingToken: z.string().optional()
});

// Helper to generate readable, unique order number
function generateOrderNumber() {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `TB-${new Date().getFullYear()}-${randomSuffix}`;
}

// POST /api/orders (Guest or Logged-in Order - Retail only; Wholesale must use /api/wholesale/orders)
router.post('/', orderLimiter, optionalAuth, validateBody(createOrderSchema), async (req, res) => {
  const { customer, shippingAddress, billingAddress, items, paymentMethod, discountCode, isAdvancePayment, channel = 'retail' } = req.body;
  const userId = req.user ? req.user.id : null;
  const isWholesaleChannel = channel === 'wholesale';

  if (isWholesaleChannel) {
    const isApprovedWholesale = Boolean(
      req.user && (req.user.role === 'admin' || (req.user.buyer_type === 'wholesale' && req.user.wholesale_status === 'approved'))
    );
    if (!isApprovedWholesale) {
      return res.status(403).json({
        data: null,
        error: 'Wholesale orders require an approved wholesale business account.'
      });
    }
    return res.status(400).json({
      data: null,
      error: 'Wholesale orders must be placed through /api/wholesale/orders.'
    });
  }

  try {
    // Execute stock check, price recalculation, and order insertion inside SQLite transaction
    const executeOrderPlacement = db.transaction(() => {
      let subtotal = 0;
      const orderItemsToInsert = [];
      const stockMovementRecords = [];

      // 1. Verify stock and calculate appropriate channel price
      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);

        if (!product) {
          throw new Error(`Product "${item.productId}" is not available in catalog.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            product.stock === 0 
              ? `"${product.name}" is now out of stock. Please remove it from your cart.`
              : `Only ${product.stock} units of "${product.name}" left in stock (you requested ${item.quantity}).`
          );
        }

        // Decrement product stock
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, product.id);

        let unitPrice = Number(product.price || 0);
        let tierApplied = 1;
        let lineTotal = unitPrice * item.quantity;

        if (isWholesaleChannel) {
          const tierInfo = getWholesaleTier(product, item.quantity);
          unitPrice = tierInfo.unitPrice;
          tierApplied = tierInfo.activeTier || 1;
          lineTotal = tierInfo.lineTotal;
        }

        const taxRate = product.gst_rate !== undefined ? Number(product.gst_rate) : 18;
        const isTaxInclusive = product.is_tax_inclusive !== undefined ? Boolean(product.is_tax_inclusive) : true;
        const taxableLine = isTaxInclusive ? Math.round(lineTotal / (1 + taxRate / 100)) : lineTotal;
        const taxAmount = isTaxInclusive ? (lineTotal - taxableLine) : Math.round(taxableLine * (taxRate / 100));

        subtotal += lineTotal;

        orderItemsToInsert.push({
          productId: product.id,
          productName: product.name,
          category: product.category,
          brand: product.brand,
          price: unitPrice,
          quantity: item.quantity,
          image: product.image,
          tierApplied,
          unitPrice: unitPrice,
          taxRate: taxRate,
          isTaxInclusive,
          taxAmount: taxAmount,
          lineTotal: lineTotal
        });

        stockMovementRecords.push({
          productId: product.id,
          qty: item.quantity,
          before: product.stock,
          after: product.stock - item.quantity
        });
      }

      // Check Minimum Order Value (MOV) ONLY for wholesale channel
      if (isWholesaleChannel) {
        const movRow = db.prepare("SELECT value FROM settings WHERE key = 'min_order_value'").get();
        const minOrderValue = movRow ? Number(movRow.value) : 250000;
        if (subtotal < minOrderValue) {
          throw new Error(`Minimum Wholesale Order Value is ${formatMoney(minOrderValue)}. Your subtotal is ${formatMoney(subtotal)}.`);
        }
      }

      // Handle Discount Code if provided
      let discountAmount = 0;
      let appliedDiscount = null;

      if (discountCode) {
        const discRow = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?) AND active = 1').get(discountCode.trim());
        if (discRow) {
          const evalResult = evaluateDiscount(discRow, { items: orderItemsToInsert }, req.user, channel);
          if (evalResult.valid) {
            discountAmount = evalResult.discountAmount + (evalResult.volumeDiscountAmount || 0);
            appliedDiscount = discRow;
          }
        }
      }

      // Shipping threshold: Retail free over ₹1,499 (149900), else ₹99 (9900). Wholesale free over ₹10,000 (1000000), else ₹250 (25000)
      let shipping = 0;
      if (isWholesaleChannel) {
        const freeShipRow = db.prepare("SELECT value FROM settings WHERE key = 'free_shipping_threshold'").get();
        const freeShippingThreshold = freeShipRow ? Number(freeShipRow.value) : 1000000;
        shipping = subtotal >= freeShippingThreshold ? 0 : 25000;
      } else {
        shipping = subtotal >= 149900 ? 0 : 9900;
      }

      const total = Math.max(0, subtotal - discountAmount + shipping);

      // Advance payment calculations (50% booking advance)
      const isAdvance = Boolean(isAdvancePayment);
      const advanceAmount = isAdvance ? Math.round(total / 2) : total;
      const balanceAmount = isAdvance ? (total - advanceAmount) : 0;

      const orderNumber = generateOrderNumber();
      const trackingToken = crypto.randomBytes(24).toString('hex');
      const now = new Date().toISOString();

      const initialStatusHistory = JSON.stringify([
        {
          status: 'Placed',
          timestamp: now,
          note: isAdvance 
            ? `Order placed with 50% advance (₹${advanceAmount.toLocaleString('en-IN')}). Balance ₹${balanceAmount.toLocaleString('en-IN')} due before dispatch.` 
            : 'Order confirmed and verified. Preparing for bulk dispatch.'
        }
      ]);

      const insertOrderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, guest_name, guest_email, guest_phone,
          business_name, gstin, billing_address, advance_amount, balance_amount, is_advance_payment,
          tracking_token, status, status_history, subtotal, shipping,
          discount_code, discount_amount, total, address, payment_method, channel, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, 'Placed', ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const orderResult = insertOrderStmt.run(
        orderNumber,
        userId,
        customer.name.trim(),
        customer.email.trim().toLowerCase(),
        customer.phone.trim(),
        customer.businessName ? customer.businessName.trim() : null,
        customer.gstin ? customer.gstin.trim().toUpperCase() : null,
        JSON.stringify(billingAddress || shippingAddress),
        advanceAmount,
        balanceAmount,
        isAdvance ? 1 : 0,
        trackingToken,
        initialStatusHistory,
        subtotal,
        shipping,
        appliedDiscount ? appliedDiscount.code : null,
        discountAmount,
        total,
        JSON.stringify(shippingAddress),
        paymentMethod,
        channel,
        now
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert snapshot items with wholesale tier breakdown & record stock movements
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, price, quantity, image,
          tier_applied, unit_price, tax_rate, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const oi of orderItemsToInsert) {
        insertItemStmt.run(
          orderId,
          oi.productId,
          oi.productName,
          oi.price,
          oi.quantity,
          oi.image,
          oi.tierApplied,
          oi.unitPrice,
          oi.taxRate,
          oi.taxAmount
        );
      }

      for (const sm of stockMovementRecords) {
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'sale', ?, 'Storefront wholesale order')
        `).run(sm.productId, -sm.qty, sm.before, sm.after, orderNumber);
      }

      // Record discount usage if applied
      if (appliedDiscount && discountAmount > 0) {
        db.prepare(`
          INSERT INTO discount_usage (discount_id, order_id, customer_email, amount_saved)
          VALUES (?, ?, ?, ?)
        `).run(appliedDiscount.id, orderId, customer.email.trim().toLowerCase(), discountAmount);

        db.prepare('UPDATE discounts SET used_count = used_count + 1 WHERE id = ?').run(appliedDiscount.id);
      }

      // Auto-generate Tax Invoice
      let invoiceId = null;
      let invoiceNumber = null;
      try {
        const invSeqRow = db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-2026-%' ORDER BY id DESC LIMIT 1").get();
        let invSeq = 1;
        if (invSeqRow && invSeqRow.invoice_number) {
          const parts = invSeqRow.invoice_number.split('-');
          const lastNum = parseInt(parts[2], 10);
          if (!isNaN(lastNum)) invSeq = lastNum + 1;
        }
        invoiceNumber = `INV-2026-${String(invSeq).padStart(4, '0')}`;

        const sellerStateRow = db.prepare("SELECT value FROM settings WHERE key = 'business_state'").get();
        const sellerCodeRow = db.prepare("SELECT value FROM settings WHERE key = 'business_state_code'").get();
        const companyState = sellerCodeRow?.value
          ? `${sellerStateRow?.value || 'Karnataka'} (${sellerCodeRow.value})`
          : (sellerStateRow?.value || 'Karnataka (29)');
        const placeOfSupply = shippingAddress?.state || companyState;
        const isIntraState = isIntraStateSupply(placeOfSupply, companyState);

        let taxableValue = 0;
        let totalTax = 0;
        let remainingDiscount = Math.min(subtotal, discountAmount);
        orderItemsToInsert.forEach((oi, idx) => {
          const share = idx === orderItemsToInsert.length - 1
            ? remainingDiscount
            : (subtotal > 0 ? Math.round((Math.min(subtotal, discountAmount) * oi.lineTotal) / subtotal) : 0);
          remainingDiscount = Math.max(0, remainingDiscount - share);
          const postDiscountLine = Math.max(0, oi.lineTotal - share);
          if (oi.isTaxInclusive) {
            const tv = Math.round(postDiscountLine / (1 + (oi.taxRate || 18) / 100));
            taxableValue += tv;
            totalTax += (postDiscountLine - tv);
          } else {
            const tv = postDiscountLine;
            taxableValue += tv;
            totalTax += Math.round((tv * (oi.taxRate || 18)) / 100);
          }
        });
        const cgst = isIntraState ? Math.round(totalTax / 2) : 0;
        const sgst = isIntraState ? (totalTax - cgst) : 0;
        const igst = isIntraState ? 0 : totalTax;
        const invoiceTotal = taxableValue + totalTax + shipping;

        const invInsert = db.prepare(`
          INSERT INTO invoices (
            invoice_number, order_id, customer_id, customer_name, customer_email, customer_phone,
            customer_gstin, place_of_supply, billing_address, shipping_address,
            invoice_date, due_date, payment_terms, status, subtotal, discount_amount,
            taxable_value, cgst_amount, sgst_amount, igst_amount, shipping_amount,
            round_off, total, amount_paid, balance_due, amount_in_words, notes, terms, template,
            channel, invoice_type
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            0, ?, ?, ?, ?, ?, 'Standard 1-year bulk manufacturer warranty.', 'standard',
            ?, ?
          )
        `).run(
          invoiceNumber,
          orderId,
          userId,
          customer.businessName || customer.name.trim(),
          customer.email.trim(),
          customer.phone.trim(),
          customer.gstin ? customer.gstin.trim().toUpperCase() : null,
          placeOfSupply,
          JSON.stringify(billingAddress || shippingAddress),
          JSON.stringify(shippingAddress),
          now.split('T')[0],
          now.split('T')[0],
          isAdvance ? '50% Advance Booking' : 'Full Payment',
          paymentMethod === 'cod' ? 'Unpaid' : (isAdvance ? 'Partially Paid' : 'Paid'),
          subtotal,
          discountAmount,
          taxableValue,
          cgst,
          sgst,
          igst,
          shipping,
          invoiceTotal,
          paymentMethod === 'cod' ? 0 : advanceAmount,
          paymentMethod === 'cod' ? invoiceTotal : balanceAmount,
          numberToWordsIndian(invoiceTotal),
          isWholesaleChannel ? 'Wholesale commercial tax invoice.' : 'Retail consumer invoice.',
          channel,
          isWholesaleChannel ? 'gst' : 'retail'
        );

        invoiceId = invInsert.lastInsertRowid;

        // Insert invoice line items
        const invItemStmt = db.prepare(`
          INSERT INTO invoice_items (
            invoice_id, product_id, item_name, quantity, rate,
            discount_percent, discount_amount, tax_rate, tax_amount, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const oi of orderItemsToInsert) {
          invItemStmt.run(
            invoiceId,
            oi.productId,
            oi.productName,
            oi.quantity,
            oi.unitPrice,
            0,
            0,
            oi.taxRate,
            oi.taxAmount,
            oi.lineTotal
          );
        }

        // Link invoice to order
        db.prepare('UPDATE orders SET invoice_id = ? WHERE id = ?').run(invoiceId, orderId);
      } catch (invErr) {
        console.error('Invoice auto-creation warning:', invErr.message);
      }

      // Upsert into customers CRM directory
      db.prepare(`
        INSERT INTO customers (name, company, email, phone, gstin, shipping_address, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          company = COALESCE(excluded.company, customers.company),
          phone = excluded.phone,
          gstin = COALESCE(excluded.gstin, customers.gstin),
          shipping_address = excluded.shipping_address
      `).run(
        customer.name.trim(),
        customer.businessName ? customer.businessName.trim() : null,
        customer.email.trim().toLowerCase(),
        customer.phone.trim(),
        customer.gstin ? customer.gstin.trim().toUpperCase() : null,
        JSON.stringify(shippingAddress),
        JSON.stringify(['Wholesale Buyer', customer.businessName ? 'B2B Business' : 'Guest Buyer'])
      );

      // If user was logged in, clear their cart in DB
      if (userId) {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
      }

      return {
        orderId,
        orderNumber,
        trackingToken,
        invoiceId,
        invoiceNumber,
        subtotal,
        discountAmount,
        shipping,
        total,
        advanceAmount,
        balanceAmount,
        isAdvancePayment: isAdvance,
        status: 'Placed',
        customer: {
          name: customer.name,
          businessName: customer.businessName,
          gstin: customer.gstin,
          email: customer.email,
          phone: customer.phone
        },
        shippingAddress,
        items: orderItemsToInsert,
        createdAt: now
      };
    });

    const createdOrder = executeOrderPlacement();

    // Process mock payment
    const paymentResult = await PaymentService.createPaymentSession({
      orderId: createdOrder.orderNumber,
      amount: createdOrder.total,
      customerEmail: createdOrder.customer.email,
      paymentMethod
    });

    return res.status(201).json({
      data: {
        order: createdOrder,
        payment: paymentResult
      },
      error: null
    });
  } catch (err) {
    return res.status(400).json({
      data: null,
      error: err.message || 'Failed to place order.'
    });
  }
});

// POST /api/orders/track (Public, Non-enumerable Guest Tracking)
router.post('/track', trackLimiter, validateBody(trackOrderSchema), (req, res) => {
  const { orderNumber, contact, trackingToken } = req.body;

  let order = null;

  if (trackingToken) {
    order = db.prepare('SELECT * FROM orders WHERE tracking_token = ?').get(trackingToken.trim());
  } else if (orderNumber && contact) {
    const cleanNum = orderNumber.trim();
    const cleanContact = contact.trim().toLowerCase();
    
    order = db.prepare(`
      SELECT * FROM orders 
      WHERE order_number = ? AND (LOWER(guest_email) = ? OR guest_phone = ?)
    `).get(cleanNum, cleanContact, contact.trim());
  }

  if (!order) {
    return res.status(404).json({
      data: null,
      error: 'Order not found. Please verify your order number and email/phone.'
    });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  return res.json({
    data: {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        statusHistory: JSON.parse(order.status_history || '[]'),
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        address: JSON.parse(order.address || '{}'),
        customer: {
          name: order.guest_name,
          email: order.guest_email,
          phone: order.guest_phone
        },
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        items: items.map(i => ({
          id: i.id,
          productId: i.product_id,
          name: i.product_name,
          price: i.price,
          quantity: i.quantity,
          image: i.image
        }))
      }
    },
    error: null
  });
});

// GET /api/orders/my (Auth-only)
router.get('/my', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT * FROM orders 
    WHERE user_id = ? OR LOWER(guest_email) = LOWER(?)
    ORDER BY created_at DESC
  `).all(req.user.id, req.user.email);

  const getItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

  const formattedOrders = orders.map(o => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    statusHistory: JSON.parse(o.status_history || '[]'),
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    address: JSON.parse(o.address || '{}'),
    paymentMethod: o.payment_method,
    createdAt: o.created_at,
    items: getItemsStmt.all(o.id).map(i => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      price: i.price,
      quantity: i.quantity,
      image: i.image
    }))
  }));

  return res.json({
    data: { orders: formattedOrders },
    error: null
  });
});

// GET /api/orders/:orderNumber/invoice (Protected: Admin, Order Owner, valid trackingToken, or matching contact)
router.get('/:orderNumber/invoice', invoiceLimiter, optionalAuth, async (req, res) => {
  const { orderNumber } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
  if (!order) {
    return res.status(404).json({ data: null, error: 'Order or invoice not found' });
  }

  const tokenParam = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const contactParam = typeof req.query.contact === 'string' ? req.query.contact.trim() : '';
  const isAdmin = req.user?.role === 'admin';
  const isOwner = Boolean(
    req.user && (
      (order.user_id && order.user_id === req.user.id) ||
      (order.guest_email && req.user.email && order.guest_email.toLowerCase() === req.user.email.toLowerCase())
    )
  );
  const hasValidToken = Boolean(tokenParam && order.tracking_token && tokenParam === order.tracking_token);
  const hasMatchingContact = Boolean(
    contactParam && (
      (order.guest_email && contactParam.toLowerCase() === order.guest_email.toLowerCase()) ||
      (order.guest_phone && contactParam === order.guest_phone)
    )
  );

  if (!isAdmin && !isOwner && !hasValidToken && !hasMatchingContact) {
    return res.status(404).json({ data: null, error: 'Order or invoice not found' });
  }

  let invoice = null;
  if (order.invoice_id) {
    invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(order.invoice_id);
  }

  if (!invoice) {
    // Lookup by invoice_number pattern
    invoice = db.prepare('SELECT * FROM invoices WHERE customer_email = ? ORDER BY id DESC LIMIT 1').get(order.guest_email);
  }

  if (!invoice) {
    return res.status(404).json({ data: null, error: 'Tax Invoice not found for this order' });
  }

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);

  // If requested directly in browser or pdf requested, stream official A4 PDF
  const wantsPdf = req.query.pdf === 'true' || 
                   req.query.download === 'true' || 
                   (req.headers.accept && req.headers.accept.includes('text/html') && req.query.format !== 'json');

  if (wantsPdf) {
    try {
      const settingsRows = db.prepare('SELECT key, value FROM settings').all();
      const settingsMap = {};
      settingsRows.forEach(r => { settingsMap[r.key] = r.value; });
      const pdfBuffer = await generateDocumentPDF({ ...invoice, items }, settingsMap, 'invoice');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
      return res.send(pdfBuffer);
    } catch (pdfErr) {
      console.error('Invoice PDF generation warning:', pdfErr);
    }
  }

  return res.json({
    data: {
      invoice: {
        ...invoice,
        billing_address: JSON.parse(invoice.billing_address || '{}'),
        shipping_address: JSON.parse(invoice.shipping_address || '{}'),
        items,
        orderNumber: order.order_number,
        paymentMethod: order.payment_method
      }
    },
    error: null
  });
});

export default router;
