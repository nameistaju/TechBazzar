import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTempDb } from './testDb.js';

const { cleanup } = setupTempDb('tb-admin-hard-');
const { default: app } = await import('../../server/index.js');
const { default: db } = await import('../../server/db/index.js');

async function getReadyAdminCookie() {
  // Set known strong password on temp admin with must_change_password = 0
  const hash = bcrypt.hashSync('StrongAdmin#2026', 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = 1').run(hash);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@techbazaar.com', password: 'StrongAdmin#2026' });
  return res.headers['set-cookie'][0].split(';')[0];
}

describe('Part 2.5 & 2.6: Admin Hardening, Cancel/Void Stock, Wholesale Approval, Stats & Uploads', () => {
  afterAll(cleanup);

  it('approves and rejects wholesale application and toggles buyer tier visibility', async () => {
    const adminCookie = await getReadyAdminCookie();
    const email = `app_buyer_${Date.now()}@example.com`;
    const hash = bcrypt.hashSync('BuyerPass#2026', 10);
    const uRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, buyer_type, wholesale_status)
      VALUES (?, ?, 'Applicant', 'customer', 'retail', 'pending')
    `).run(email, hash);
    const userId = uRes.lastInsertRowid;

    const appRes = db.prepare(`
      INSERT INTO wholesale_applications (user_id, business_name, contact_name, email, phone, city, gstin, business_type, status)
      VALUES (?, 'Apex Corp', 'Applicant', ?, '9876543210', 'Bengaluru', '29ABCDE1234F1Z5', 'Retailer', 'pending')
    `).run(userId, email);
    const appId = appRes.lastInsertRowid;

    const approveRes = await request(app)
      .post(`/api/admin/wholesale/applications/${appId}/approve`)
      .set('Cookie', adminCookie)
      .send({ groupId: 2 });
    expect(approveRes.status).toBe(200);

    const buyerLogin = await request(app).post('/api/auth/login').send({ email, password: 'BuyerPass#2026' });
    const buyerCookie = buyerLogin.headers['set-cookie'][0].split(';')[0];

    const prodRes = await request(app).get('/api/products?limit=1').set('Cookie', buyerCookie);
    expect(prodRes.body.data.products[0].tier1Price).toBeTruthy();

    const rejectRes = await request(app)
      .post(`/api/admin/wholesale/applications/${appId}/reject`)
      .set('Cookie', adminCookie)
      .send({ reason: 'Audit revoke test' });
    expect(rejectRes.status).toBe(200);

    const updatedUser = db.prepare('SELECT wholesale_status FROM users WHERE id = ?').get(userId);
    expect(updatedUser.wholesale_status).toBe('rejected');
  });

  it('restores stock exactly once when cancelling an order then voiding its linked invoice', async () => {
    const adminCookie = await getReadyAdminCookie();
    const prod = db.prepare('SELECT id FROM products WHERE deleted_at IS NULL LIMIT 1').get();
    db.prepare('UPDATE products SET stock = 20 WHERE id = ?').run(prod.id);

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customer: { name: 'CancelVoid', email: `cv_${Date.now()}@example.com`, phone: '9876543210' },
        shippingAddress: { addressLine: '12 MG Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        items: [{ productId: prod.id, quantity: 3 }],
        paymentMethod: 'upi',
        channel: 'retail'
      });
    expect(orderRes.status).toBe(201);
    expect(db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock).toBe(17);

    const orderRow = db.prepare('SELECT id, invoice_id FROM orders WHERE order_number = ?').get(orderRes.body.data.order.orderNumber);

    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${orderRow.id}`)
      .set('Cookie', adminCookie)
      .send({ status: 'Cancelled' });
    expect(cancelRes.status).toBe(200);
    expect(db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock).toBe(20);

    const voidRes = await request(app)
      .post(`/api/admin/invoices/${orderRow.invoice_id}/void`)
      .set('Cookie', adminCookie)
      .send({ voidReason: 'Double restore guard test' });
    expect(voidRes.status).toBe(200);
    expect(db.prepare('SELECT stock FROM products WHERE id = ?').get(prod.id).stock).toBe(20);
  });

  it('matches /api/admin/stats retailRevenue & wholesaleRevenue against direct SQL', async () => {
    const adminCookie = await getReadyAdminCookie();
    const statsRes = await request(app).get('/api/admin/stats?range=30d').set('Cookie', adminCookie);
    expect(statsRes.status).toBe(200);

    const direct = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN COALESCE(channel, 'retail') != 'wholesale' THEN total ELSE 0 END), 0) as retailRevenue,
        COALESCE(SUM(CASE WHEN channel = 'wholesale' THEN total ELSE 0 END), 0) as wholesaleRevenue
      FROM orders WHERE status != 'Cancelled'
    `).get();
    expect(statsRes.body.data.retailRevenue).toBe(direct.retailRevenue);
    expect(statsRes.body.data.wholesaleRevenue).toBe(direct.wholesaleRevenue);
  });

  it('rejects malformed Zod admin payloads, SVG uploads, and fake .png uploads', async () => {
    const adminCookie = await getReadyAdminCookie();

    const badOrder = await request(app)
      .patch('/api/admin/orders/1')
      .set('Cookie', adminCookie)
      .send({ status: 'NotARealStatus' });
    expect(badOrder.status).toBe(400);

    const svgUpload = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', adminCookie)
      .attach('image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'evil.svg');
    expect(svgUpload.status).toBe(400);

    const fakePngUpload = await request(app)
      .post('/api/admin/branding/logo')
      .set('Cookie', adminCookie)
      .send({
        fileData: 'data:image/png;base64,' + Buffer.from('not-actually-a-png-header').toString('base64'),
        fileName: 'fake.png'
      });
    expect(fakePngUpload.status).toBe(400);
  });
});
