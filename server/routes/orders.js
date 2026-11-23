import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import PaymentService from '../services/payment.js';
import { evaluateDiscount } from '../services/calculation.js';

const router = Router();

// Rate limiter for order placement: max 15 requests per 10 minutes per IP
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { data: null, error: 'Too many order requests. Please try again in a few minutes.' }
});

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid 10-digit phone number is required')
  }),
  shippingAddress: z.object({
    addressLine: z.string().min(3, 'Address line is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit PIN code is required')
  }),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  })).min(1, 'Order must contain at least one item'),
  paymentMethod: z.enum(['cod', 'card', 'upi']).default('card'),
  discountCode: z.string().optional()
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

// POST /api/orders (Guest or Logged-in)
router.post('/', orderLimiter, optionalAuth, validateBody(createOrderSchema), async (req, res) => {
  const { customer, shippingAddress, items, paymentMethod, discountCode } = req.body;
  const userId = req.user ? req.user.id : null;

  try {
    // Execute stock check, price recalculation, and order insertion inside SQLite transaction
    const executeOrderPlacement = db.transaction(() => {
      let subtotal = 0;
      const orderItemsToInsert = [];
      const stockMovementRecords = [];

      // 1. Verify and decrement stock for each item
      for (const item of items) {
        const product = db.prepare('SELECT id, name, category, brand, price, stock, image FROM products WHERE id = ?').get(item.productId);

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

        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;

        orderItemsToInsert.push({
          productId: product.id,
          productName: product.name,
          category: product.category,
          brand: product.brand,
          price: product.price,
          quantity: item.quantity,
          image: product.image
        });

        stockMovementRecords.push({
          productId: product.id,
          qty: item.quantity,
          before: product.stock,
          after: product.stock - item.quantity
        });
      }

      // Handle Discount Code if provided
      let discountAmount = 0;
      let appliedDiscount = null;

      if (discountCode) {
        const discRow = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?) AND active = 1').get(discountCode.trim());
        if (discRow) {
          const evalResult = evaluateDiscount(discRow, { items: orderItemsToInsert });
          if (evalResult.valid) {
            discountAmount = evalResult.discountAmount;
            appliedDiscount = discRow;
          }
        }
      }

      // Free shipping over ₹999, else ₹99
      const shipping = subtotal >= 999 ? 0 : 99;
      const total = Math.max(0, subtotal - discountAmount + shipping);

      const orderNumber = generateOrderNumber();
      const trackingToken = crypto.randomBytes(24).toString('hex');
      const now = new Date().toISOString();

      const initialStatusHistory = JSON.stringify([
        {
          status: 'Placed',
          timestamp: now,
          note: 'Order confirmed and verified. Preparing for dispatch.'
        }
      ]);

      const insertOrderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, user_id, guest_name, guest_email, guest_phone,
          tracking_token, status, status_history, subtotal, shipping,
          discount_code, discount_amount, total, address, payment_method, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, 'Placed', ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `);

      const orderResult = insertOrderStmt.run(
        orderNumber,
        userId,
        customer.name.trim(),
        customer.email.trim().toLowerCase(),
        customer.phone.trim(),
        trackingToken,
        initialStatusHistory,
        subtotal,
        shipping,
        appliedDiscount ? appliedDiscount.code : null,
        discountAmount,
        total,
        JSON.stringify(shippingAddress),
        paymentMethod,
        now
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert snapshot items & record stock movements
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, product_name, price, quantity, image
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const oi of orderItemsToInsert) {
        insertItemStmt.run(orderId, oi.productId, oi.productName, oi.price, oi.quantity, oi.image);
      }

      for (const sm of stockMovementRecords) {
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'sale', ?, 'Storefront customer order')
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

      // Upsert into customers CRM directory
      db.prepare(`
        INSERT INTO customers (name, email, phone, shipping_address, tags)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          phone = excluded.phone,
          shipping_address = excluded.shipping_address
      `).run(
        customer.name.trim(),
        customer.email.trim().toLowerCase(),
        customer.phone.trim(),
        JSON.stringify(shippingAddress),
        JSON.stringify(['Storefront Buyer'])
      );

      // If user was logged in, clear their cart in DB
      if (userId) {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
      }

      return {
        orderId,
        orderNumber,
        trackingToken,
        subtotal,
        discountAmount,
        shipping,
        total,
        status: 'Placed',
        customer: {
          name: customer.name,
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
router.post('/track', validateBody(trackOrderSchema), (req, res) => {
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

export default router;
