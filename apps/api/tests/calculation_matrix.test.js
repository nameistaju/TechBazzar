import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { setupTempDb } from './testDb.js';

const { cleanup } = setupTempDb('tb-calc-matrix-');
const { default: app } = await import('../src/app.js');
const { default: db } = await import('../db/index.js');
const { calculateRetailCart, calculateWholesaleCart } = await import('../services/calculation.js');

// Deterministic PRNG (Mulberry32)
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allProducts = db
  .prepare('SELECT * FROM products WHERE deleted_at IS NULL AND stock >= 20 LIMIT 12')
  .all();

// Ensure at least one tax-exclusive product exists in temp DB for coverage
if (allProducts.length > 0) {
  db.prepare('UPDATE products SET is_tax_inclusive = 0 WHERE id = ?').run(allProducts[0].id);
  allProducts[0].is_tax_inclusive = 0;
}

describe('Part 2.1: 40 Seeded-Random Retail & Wholesale Cart -> Order -> Invoice -> PDF Consistency', () => {
  afterAll(cleanup);

  const rand = mulberry32(20261125);
  const retailCases = Array.from({ length: 20 }, (_, i) => ({
    idx: i + 1,
    prodIdx: Math.floor(rand() * allProducts.length),
    qty: 1 + Math.floor(rand() * 3),
    state: i % 2 === 0 ? 'Karnataka' : 'Maharashtra'
  }));

  it.each(retailCases)(
    'Retail case #$idx: cart total === order total === invoice total === PDF valid',
    async ({ prodIdx, qty, state }) => {
      const prod = allProducts[prodIdx];
      // Replenish stock in temp DB so all 20 seeded cases can place orders
      db.prepare('UPDATE products SET stock = 500 WHERE id = ?').run(prod.id);

      const cartCalc = calculateRetailCart({ items: [{ product: prod, quantity: qty }] });
      const res = await request(app)
        .post('/api/orders')
        .send({
          customer: {
            name: 'Seeded Retail',
            email: `retail_${prodIdx}_${qty}_${Date.now()}@example.com`,
            phone: '9876543210'
          },
          shippingAddress: {
            addressLine: '100 MG Road',
            city: state === 'Karnataka' ? 'Bengaluru' : 'Mumbai',
            state,
            pincode: state === 'Karnataka' ? '560001' : '400001'
          },
          items: [{ productId: prod.id, quantity: qty }],
          paymentMethod: 'upi',
          channel: 'retail'
        });

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(Number.isInteger(order.total)).toBe(true);
      expect(order.total).toBe(cartCalc.total);

      const inv = db.prepare('SELECT * FROM invoices WHERE invoice_number = ?').get(order.invoiceNumber);
      expect(inv).toBeTruthy();
      expect(inv.total).toBe(order.total);
      expect(inv.taxable_value + inv.cgst_amount + inv.sgst_amount + inv.igst_amount + inv.shipping_amount).toBe(inv.total);

      const pdfRes = await request(app).get(
        `/api/orders/${order.orderNumber}/invoice?token=${encodeURIComponent(order.trackingToken)}&pdf=true`
      );
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
      expect(pdfRes.body.slice(0, 5).toString('utf8')).toBe('%PDF-');
    }
  );

  const groups = db.prepare('SELECT * FROM wholesale_groups ORDER BY id ASC').all();
  const wholesaleCases = Array.from({ length: 20 }, (_, i) => ({
    idx: i + 1,
    prodIdx: Math.floor(rand() * allProducts.length),
    groupIdx: i % groups.length,
    state: i % 2 === 0 ? 'Karnataka (29)' : 'Maharashtra (27)'
  }));

  it.each(wholesaleCases)(
    'Wholesale case #$idx: integer paise, group free-shipping, CGST/SGST vs IGST exact match',
    ({ prodIdx, groupIdx, state }) => {
      const prod = allProducts[prodIdx];
      const group = groups[groupIdx];
      const qty = Math.max(Number(prod.moq || 10), 10);

      const ws = calculateWholesaleCart({
        items: [{ product: prod, quantity: qty }],
        group,
        placeOfSupply: state,
        companyState: 'Karnataka (29)'
      });

      expect(Number.isInteger(ws.total)).toBe(true);
      expect(Number.isInteger(ws.taxableValue)).toBe(true);
      expect(Number.isInteger(ws.totalTax)).toBe(true);
      expect(ws.taxableValue + ws.totalTax + ws.shipping + ws.roundOff).toBe(ws.total);

      if (state.includes('Karnataka')) {
        expect(ws.igstAmount).toBe(0);
        expect(ws.cgstAmount + ws.sgstAmount).toBe(ws.totalTax);
      } else {
        expect(ws.cgstAmount).toBe(0);
        expect(ws.sgstAmount).toBe(0);
        expect(ws.igstAmount).toBe(ws.totalTax);
      }

      if (group.free_shipping_threshold === 0) {
        expect(ws.shipping).toBe(0);
      }
    }
  );
});
