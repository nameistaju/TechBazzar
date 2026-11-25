import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { setupTempDb } from './testDb.js';

const { cleanup } = setupTempDb('tb-admin-auth-');
const { default: app } = await import('../index.js');

describe('Part 1: Admin Default Credentials & Session Enforcement', () => {
  afterAll(cleanup);

  it('forces password change on admin@techbazaar.com / admin123 and blocks /api/admin/stats until changed', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@techbazaar.com', password: 'admin123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.mustChangePassword).toBe(true);
    const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
    expect(cookie).toBeTruthy();

    // Admin API call MUST be blocked while must_change_password = 1
    const statsBlocked = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', cookie);
    expect(statsBlocked.status).toBe(403);
    expect(statsBlocked.body.code).toBe('MUST_CHANGE_PASSWORD');

    // Change password with weak/missing current fails
    const badPw = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'admin123', newPassword: 'short' });
    expect(badPw.status).toBe(400);

    // Valid strong password change succeeds & invalidates old token_version
    const goodPw = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'admin123', newPassword: 'StrongOwnerPass#2026' });
    expect(goodPw.status).toBe(200);
    const newCookie = goodPw.headers['set-cookie']?.[0]?.split(';')[0];
    expect(newCookie).toBeTruthy();

    // Old cookie must now be rejected (401) because token_version incremented
    const oldStats = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', cookie);
    expect(oldStats.status).toBe(401);

    // New cookie succeeds
    const okStats = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', newCookie);
    expect(okStats.status).toBe(200);
  });
});
