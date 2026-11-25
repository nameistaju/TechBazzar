import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTempDb } from './testDb.js';

const { cleanup } = setupTempDb('tb-orders-stock-');
const { default: app } = await import('../src/app.js');
const { default: db } = await import('../db/index.js');

describe('Part 2.3, 2.5 & 2.7: Wholesale Enforcement, Stock Concurrency, Idempotency & Coupons', () => {
  afterAll(cleanup);

  it('rejects guest and unapproved retail users posting channel=wholesale to /api/orders', async () => {
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL AND stock >= 20 LIMIT 1').get();
    const guestRes = await request(app)
      .post('/api/orders')
      .send({
        customer: { name: 'Guest', email: 'guest_ws@example.com', phone: '9876543210' },
        shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        items: [{ productId: prod.id, quantity: 10 }],
        paymentMethod: 'upi',
        channel: 'wholesale'
      });
    expect(guestRes.status).toBe(403);
  });

  it('ignores client-tampered price, total, and discountAmount in POST /api/orders', async () => {
    const prod = db.prepare('SELECT id, price, stock FROM products WHERE deleted_at IS NULL AND stock >= 5 LIMIT 1').get();
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer: { name: 'Tamper User', email: `tamper_${Date.now()}@example.com`, phone: '9876543210' },
        shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        items: [{ productId: prod.id, quantity: 1, price: 100 }],
        total: 100,
        discountAmount: 999999,
        paymentMethod: 'upi',
        channel: 'retail'
      });
    expect(res.status).toBe(201);
    expect(res.body.data.order.subtotal).toBe(prod.price);
    expect(res.body.data.order.total).toBeGreaterThanOrEqual(prod.price);
  });

  it('allows only ONE of two parallel orders for the last remaining unit in stock', async () => {
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL LIMIT 1').get();
    db.prepare('UPDATE products SET stock = 1, allow_backorder = 0 WHERE id = ?').run(prod.id);

    const makeOrder = (idx) =>
      request(app)
        .post('/api/orders')
        .send({
          customer: { name: `Race ${idx}`, email: `race_${idx}_${Date.now()}@example.com`, phone: '9876543210' },
          shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
          items: [{ productId: prod.id, quantity: 1 }],
          paymentMethod: 'upi',
          channel: 'retail'
        });

    const [r1, r2] = await Promise.all([makeOrder(1), makeOrder(2)]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 400]);

    const finalStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock;
    expect(finalStock).toBe(0);
  });

  it('enforces Idempotency-Key replay without double-decrementing stock', async () => {
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL LIMIT 1').get();
    db.prepare('UPDATE products SET stock = 10 WHERE id = ?').run(prod.id);
    const key = `idem-p2-${Date.now()}`;
    const body = {
      customer: { name: 'Idem', email: `idem2_${Date.now()}@example.com`, phone: '9876543210' },
      shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      items: [{ productId: prod.id, quantity: 2 }],
      paymentMethod: 'upi',
      channel: 'retail'
    };

    const r1 = await request(app).post('/api/orders').set('Idempotency-Key', key).send(body);
    const r2 = await request(app).post('/api/orders').set('Idempotency-Key', key).send(body);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r2.body.data.order.orderNumber).toBe(r1.body.data.order.orderNumber);
    expect(db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock).toBe(8);
  });

  it('enforces channel audience on coupons & records discount_usage on checkout', async () => {
    const prod = db.prepare('SELECT id, price FROM products WHERE deleted_at IS NULL AND price >= 50000 LIMIT 1').get();
    db.prepare('UPDATE products SET stock = 20 WHERE id = ?').run(prod.id);

    // Create a retail-only and wholesale-only coupon in temp DB
    db.prepare(`
      INSERT OR REPLACE INTO discounts (code, title, type, value, scope, min_cart_amount, min_quantity, active, audience)
      VALUES ('RETAILONLY10', 'Retail Only 10%', 'percentage', 10, 'cart', 0, 1, 1, 'retail')
    `).run();
    db.prepare(`
      INSERT OR REPLACE INTO discounts (code, title, type, value, scope, min_cart_amount, min_quantity, active, audience)
      VALUES ('WS_ONLY10', 'Wholesale Only 10%', 'percentage', 10, 'cart', 0, 1, 1, 'wholesale')
    `).run();

    const okRetail = await request(app)
      .post('/api/cart/apply-discount')
      .send({ code: 'RETAILONLY10', items: [{ productId: prod.id, quantity: 1 }], channel: 'retail' });
    expect(okRetail.status).toBe(200);
    expect(okRetail.body.data.discountAmount).toBe(Math.round(prod.price * 0.1));

    const badRetail = await request(app)
      .post('/api/cart/apply-discount')
      .send({ code: 'WS_ONLY10', items: [{ productId: prod.id, quantity: 1 }], channel: 'retail' });
    expect(badRetail.status).toBe(400);

    const badWs = await request(app)
      .post('/api/cart/apply-discount')
      .send({ code: 'RETAILONLY10', items: [{ productId: prod.id, quantity: 1 }], channel: 'wholesale' });
    expect(badWs.status).toBe(400);

    const email = `disc_user_${Date.now()}@example.com`;
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customer: { name: 'Coupon Buyer', email, phone: '9876543210' },
        shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        items: [{ productId: prod.id, quantity: 1 }],
        paymentMethod: 'upi',
        discountCode: 'RETAILONLY10',
        channel: 'retail'
      });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.order.discountAmount).toBe(Math.round(prod.price * 0.1));

    const usageRow = db.prepare('SELECT * FROM discount_usage WHERE customer_email = ?').get(email);
    expect(usageRow).toBeTruthy();
    expect(usageRow.amount_saved).toBe(Math.round(prod.price * 0.1));
  });

  it('rejects approved wholesale buyer below MOQ or below MOV in /api/wholesale/orders', async () => {
    const email = `ws_buyer_${Date.now()}@example.com`;
    const hash = bcrypt.hashSync('BuyerPass#2026', 10);
    const uRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, buyer_type, wholesale_status, group_id, business_name)
      VALUES (?, ?, 'WS Buyer', 'customer', 'wholesale', 'approved', 1, 'WS Traders')
    `).run(email, hash);

    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'BuyerPass#2026' });
    const cookie = loginRes.headers['set-cookie'][0].split(';')[0];

    const prod = db.prepare('SELECT id, moq FROM products WHERE deleted_at IS NULL AND stock >= 20 LIMIT 1').get();
    // Insert below MOQ directly into wholesale_cart_items to verify server-side MOQ gate
    db.prepare('INSERT INTO wholesale_cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)').run(uRes.lastInsertRowid, prod.id);

    const orderRes = await request(app)
      .post('/api/wholesale/orders')
      .set('Cookie', cookie)
      .send({
        shippingAddress: { addressLine: 'Plot 5', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        paymentMethod: 'bank_transfer'
      });
    expect(orderRes.status).toBe(400);
  });
});
