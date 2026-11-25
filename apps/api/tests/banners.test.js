import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { setupTempDb } from './testDb.js';

const { cleanup } = setupTempDb('tb-banners-');
const { default: app } = await import('../src/app.js');
const { default: db } = await import('../db/index.js');

async function loginAsAdmin() {
  const hash = bcrypt.hashSync('StrongOwnerPass#2026', 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE email = ?').run(hash, 'admin@techbazaar.com');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@techbazaar.com', password: 'StrongOwnerPass#2026' });
  return res.headers['set-cookie']?.[0]?.split(';')[0];
}

describe('Feature 2: Banners & Ads API, Sharp Upload & Analytics Dedupe', () => {
  afterAll(cleanup);

  it('accepts valid PNG/JPEG/WebP (1800x600 & 1200x900), converts to WebP, generates thumb, and serves 200', async () => {
    const cookie = await loginAsAdmin();

    const desktopPng = await sharp({
      create: { width: 1800, height: 600, channels: 3, background: { r: 37, g: 99, b: 235 } }
    }).png().toBuffer();

    const resDesktop = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({
        base64: `data:image/png;base64,${desktopPng.toString('base64')}`,
        type: 'desktop'
      });
    expect(resDesktop.status).toBe(200);
    expect(resDesktop.body.data.url).toMatch(/\.webp$/);
    expect(resDesktop.body.data.thumbUrl).toMatch(/thumb_desktop_.*\.webp$/);
    expect(resDesktop.body.data.width).toBe(1800);
    expect(resDesktop.body.data.height).toBe(600);

    const serveRes = await request(app).get(resDesktop.body.data.url);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers['content-type']).toMatch(/image\/webp/);

    const mobileJpg = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 10, g: 10, b: 10 } }
    }).jpeg().toBuffer();

    const resMobile = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({
        base64: `data:image/jpeg;base64,${mobileJpg.toString('base64')}`,
        type: 'mobile'
      });
    expect(resMobile.status).toBe(200);
    expect(resMobile.body.data.mime).toBe('image/webp');
  });

  it('returns 422 cropNeeded on wrong aspect ratio and rejects SVG, fake exe, corrupt, and >5MB', async () => {
    const cookie = await loginAsAdmin();

    // Wrong ratio (400x400 for 3:1 desktop)
    const squarePng = await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 200, g: 50, b: 50 } }
    }).png().toBuffer();
    const ratioRes = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({ base64: `data:image/png;base64,${squarePng.toString('base64')}`, type: 'desktop' });
    expect(ratioRes.status).toBe(422);
    expect(ratioRes.body.data.cropNeeded).toBe(true);

    // SVG rejected
    const svgB64 = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
    const svgRes = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({ base64: svgB64, type: 'desktop' });
    expect(svgRes.status).toBe(400);

    // Fake exe renamed .png
    const fakeExe = 'data:image/png;base64,' + Buffer.from('MZ\x90\x00\x03\x00\x00\x00').toString('base64');
    const exeRes = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({ base64: fakeExe, type: 'desktop' });
    expect(exeRes.status).toBe(400);

    // Corrupt PNG header
    const corruptPng = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 100]).toString('base64');
    const corruptRes = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({ base64: corruptPng, type: 'desktop' });
    expect(corruptRes.status).toBe(400);

    // > 5MB rejected
    const huge = 'data:image/png;base64,' + Buffer.alloc(5 * 1024 * 1024 + 50, 0xff).toString('base64');
    const hugeRes = await request(app)
      .post('/api/admin/banners/upload')
      .set('Cookie', cookie)
      .send({ base64: huge, type: 'desktop' });
    expect(hugeRes.status).toBe(400);
  });

  it('filters active/scheduled banners, dedupes impressions & clicks, and reports media health', async () => {
    const cookie = await loginAsAdmin();

    // Create future-scheduled banner
    const futureRes = await request(app)
      .post('/api/admin/banners')
      .set('Cookie', cookie)
      .send({
        title: 'Future Banner',
        slot: 'cart-promo',
        desktop_image: '/uploads/banners/does-not-exist.webp',
        mobile_image: '/uploads/banners/does-not-exist.webp',
        starts_at: '2099-01-01T00:00:00',
        active: 1
      });
    expect(futureRes.status).toBe(201);
    const futureId = futureRes.body.data.banner.id;

    // Public GET should NOT include future banner
    const pubRes = await request(app).get('/api/banners?slot=cart-promo');
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.some((b) => b.id === futureId)).toBe(false);

    // Admin GET should flag missing file in media_health
    const adminList = await request(app)
      .get('/api/admin/banners')
      .set('Cookie', cookie);
    const flagged = adminList.body.data.banners.find((b) => b.id === futureId);
    expect(flagged.media_health.healthy).toBe(false);
    expect(flagged.media_health.missing).toContain('desktop');

    // Impression & click dedupe on banner #1
    const imp1 = await request(app).post('/api/banners/1/impression').set('x-session-id', 'sess-abc');
    const imp2 = await request(app).post('/api/banners/1/impression').set('x-session-id', 'sess-abc');
    expect(imp1.body.data.deduped).toBe(false);
    expect(imp2.body.data.deduped).toBe(true);

    const clk1 = await request(app).post('/api/banners/1/click').set('x-session-id', 'sess-abc');
    const clk2 = await request(app).post('/api/banners/1/click').set('x-session-id', 'sess-abc');
    expect(clk1.body.data.deduped).toBe(false);
    expect(clk2.body.data.deduped).toBe(true);
  });
});
