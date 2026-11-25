import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { setupTempDb } from './testDb.js';

const { cleanup } = setupTempDb('tb-sec-api-');
const { default: app } = await import('../index.js');
const { default: db } = await import('../db/index.js');
const { getJwtSecret } = await import('../middleware/auth.js');

describe('Part 2.2 & 2.4: Invoice/Quote Access Control, Leak Scan & JWT Guard', () => {
  afterAll(cleanup);

  it('requires strong JWT_SECRET when NODE_ENV=production', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      expect(() => getJwtSecret()).toThrow(/FATAL: JWT_SECRET/);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      process.env.JWT_SECRET = prevSecret;
    }
  });

  it('enforces uniform 404 on /api/orders/:orderNumber/invoice for stranger & nonexistent order, allows token & contact', async () => {
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL AND stock >= 5 LIMIT 1').get();
    const email = `inv_owner_${Date.now()}@example.com`;
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customer: { name: 'Invoice Owner', email, phone: '9876501234' },
        shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        items: [{ productId: prod.id, quantity: 1 }],
        paymentMethod: 'upi',
        channel: 'retail'
      });
    expect(createRes.status).toBe(201);
    const { orderNumber, trackingToken } = createRes.body.data.order;

    const strangerRes = await request(app).get(`/api/orders/${orderNumber}/invoice`);
    const missingRes = await request(app).get('/api/orders/TB-2099-00000/invoice');
    expect(strangerRes.status).toBe(404);
    expect(missingRes.status).toBe(404);
    expect(strangerRes.body).toEqual(missingRes.body);

    const tokenRes = await request(app).get(`/api/orders/${orderNumber}/invoice?token=${encodeURIComponent(trackingToken)}`);
    expect(tokenRes.status).toBe(200);

    const contactRes = await request(app).get(`/api/orders/${orderNumber}/invoice?contact=${encodeURIComponent(email)}`);
    expect(contactRes.status).toBe(200);
  });

  it('enforces uniform 404 on /api/quotes/:quoteNumber for stranger & nonexistent quote, allows matching contact', async () => {
    const quote = db.prepare('SELECT quote_number, email FROM quote_requests LIMIT 1').get();
    if (!quote) return;

    const strangerRes = await request(app).get(`/api/quotes/${quote.quote_number}`);
    const missingRes = await request(app).get('/api/quotes/RFQ-2099-9999');
    expect(strangerRes.status).toBe(404);
    expect(missingRes.status).toBe(404);
    expect(strangerRes.body).toEqual(missingRes.body);

    const ownerRes = await request(app).get(`/api/quotes/${quote.quote_number}?contact=${encodeURIComponent(quote.email)}`);
    expect(ownerRes.status).toBe(200);
  });

  it('strips wholesale tier prices from all public GET product endpoints when wholesale_prices_only_registered=1', async () => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('wholesale_prices_only_registered', '1')").run();
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL LIMIT 1').get();

    const endpoints = [
      '/api/products',
      `/api/products/${prod.id}`,
      '/api/products/suggest?q=a',
      '/api/products/search?q=a'
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.status).toBe(200);
      const raw = JSON.stringify(res.body);
      expect(raw).not.toMatch(/tier1Price|tier2Price|tier3Price|tier4Price|wholesalePrice/);
    }
  });
});
