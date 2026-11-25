import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index.js';
import db from '../../server/db/index.js';

describe('Security & API Integration', () => {
  it('blocks unauthenticated invoice & quote enumeration with uniform 404', async () => {
    const order = db.prepare('SELECT order_number FROM orders LIMIT 1').get();
    if (order) {
      const res = await request(app).get(`/api/orders/${order.order_number}/invoice`);
      expect(res.status).toBe(404);
    }
    const quote = db.prepare('SELECT quote_number FROM quote_requests LIMIT 1').get();
    if (quote) {
      const res = await request(app).get(`/api/quotes/${quote.quote_number}`);
      expect(res.status).toBe(404);
    }
  });

  it('rejects guest wholesale orders via POST /api/orders', async () => {
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL AND stock >= 1 LIMIT 1').get();
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer: { name: 'Guest', email: 'guest@example.com', phone: '9876543210' },
        shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        items: [{ productId: prod.id, quantity: 1 }],
        paymentMethod: 'upi',
        channel: 'wholesale'
      });
    expect(res.status).toBe(403);
  });

  it('evaluates real coupon WELCOME10 in paise via POST /api/cart/apply-discount', async () => {
    const prod = db.prepare('SELECT id, price FROM products WHERE deleted_at IS NULL AND price >= 50000 LIMIT 1').get();
    const res = await request(app)
      .post('/api/cart/apply-discount')
      .send({ code: 'WELCOME10', items: [{ productId: prod.id, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.discountAmount).toBe(Math.round(prod.price * 0.1));
  });

  it('enforces Idempotency-Key on POST /api/orders', async () => {
    const prod = db.prepare('SELECT id, stock FROM products WHERE deleted_at IS NULL AND stock >= 3 LIMIT 1').get();
    const key = `vitest-idem-${Date.now()}`;
    const payload = {
      customer: { name: 'Test Buyer', email: `vitest_${Date.now()}@example.com`, phone: '9876543210' },
      shippingAddress: { addressLine: '10 Church St', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      items: [{ productId: prod.id, quantity: 1 }],
      paymentMethod: 'upi',
      channel: 'retail'
    };

    const r1 = await request(app).post('/api/orders').set('Idempotency-Key', key).send(payload);
    expect(r1.status).toBe(201);

    const r2 = await request(app).post('/api/orders').set('Idempotency-Key', key).send(payload);
    expect(r2.status).toBe(201);
    expect(r2.body.data.order.orderNumber).toBe(r1.body.data.order.orderNumber);

    const after = db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock;
    expect(after).toBe(prod.stock - 1);
  });
});
