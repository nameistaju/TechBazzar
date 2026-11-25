import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTempDb } from './testDb.js';
import {
  parseHex,
  getContrastRatio,
  findNearestAccessibleShade,
  deriveColorTokens
} from '../../web/src/shared/utils/colorContrast.js';

const { cleanup } = setupTempDb('tb-branding-');
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

describe('Feature 1: WCAG 2.1 Contrast Helper & Branding API', () => {
  afterAll(cleanup);

  it('computes exact WCAG 2.1 contrast ratios for known colour pairs', () => {
    expect(getContrastRatio('#FFFFFF', '#000000')).toBe(21);

    const limeTokens = deriveColorTokens('#84CC16');
    expect(limeTokens.contrast_ratio_white).toBeCloseTo(1.98, 1);
    expect(limeTokens.aa_text_pass).toBe(false);
    expect(limeTokens.aa_ui_pass).toBe(false);
    expect(limeTokens.accent_contrast).toBe('#0A0A0A');
    expect(limeTokens.label_contrast_ratio).toBeGreaterThan(9.5);
    expect(limeTokens.aa_label_pass).toBe(true);

    const orangeTokens = deriveColorTokens('#FF4D00');
    expect(orangeTokens.contrast_ratio_white).toBeGreaterThan(3.1);
    expect(orangeTokens.contrast_ratio_white).toBeLessThan(3.5);
    expect(orangeTokens.aa_text_pass).toBe(false);
    expect(orangeTokens.aa_ui_pass).toBe(true);

    const accessibleLime = findNearestAccessibleShade('#84CC16', 4.5);
    expect(getContrastRatio(accessibleLime, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('normalizes 3/6-digit hex with/without # and rejects invalid hex', () => {
    expect(parseHex('f00')).toEqual({ valid: true, hex: '#FF0000', error: null });
    expect(parseHex('#2563eb')).toEqual({ valid: true, hex: '#2563EB', error: null });
    expect(parseHex('84cc16')).toEqual({ valid: true, hex: '#84CC16', error: null });
    expect(parseHex('#GGGGGG').valid).toBe(false);
    expect(parseHex('12345').valid).toBe(false);
  });

  it('persists branding via PUT /api/admin/branding and returns fresh tokens on GET /api/branding with no-cache', async () => {
    const cookie = await loginAsAdmin();

    const badRes = await request(app)
      .put('/api/admin/branding')
      .set('Cookie', cookie)
      .send({ accent_hex: 'not-a-hex' });
    expect(badRes.status).toBe(400);

    const putRes = await request(app)
      .put('/api/admin/branding')
      .set('Cookie', cookie)
      .send({
        brand_name: 'VoltGear',
        tagline: 'Pro Audio & Tech',
        accent_hex: '#2563EB'
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.accent_hex).toBe('#2563EB');
    expect(putRes.body.data.accent_rgb).toBe('37 99 235');

    const getRes = await request(app).get('/api/branding');
    expect(getRes.status).toBe(200);
    expect(getRes.headers['cache-control']).toBe('no-cache');
    expect(getRes.headers['etag']).toBeTruthy();
    expect(getRes.body.data.accent_hex).toBe('#2563EB');
    expect(getRes.body.data.brand_name).toBe('VoltGear');

    // ETag 304 check
    const cachedRes = await request(app)
      .get('/api/branding')
      .set('If-None-Match', getRes.headers['etag']);
    expect(cachedRes.status).toBe(304);

    // SVG logo upload rejected
    const svgBase64 = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
    const svgRes = await request(app)
      .post('/api/admin/branding/logo')
      .set('Cookie', cookie)
      .send({ fileData: svgBase64, targetType: 'mark' });
    expect(svgRes.status).toBe(400);
    expect(svgRes.body.error).toMatch(/svg/i);
  });
});
