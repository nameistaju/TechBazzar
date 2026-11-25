import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS_DIR = path.resolve('docs/audit/screenshots/feature-fix');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@techbazaar.com';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'StrongOwnerPass#2026';

async function loginAdminViaApi(page) {
  await page.goto('/');
  const res = await page.evaluate(async ({ email, password }) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return { ok: r.ok, status: r.status, body: await r.json() };
  }, { email: ADMIN_EMAIL, password: ADMIN_PASS });
  expect(res.ok, `Admin login failed: ${JSON.stringify(res)}`).toBe(true);
  if (res.body?.data?.token) {
    await page.evaluate((t) => localStorage.setItem('techbazaar_token', t), res.body.data.token);
  }
}

test.describe('Feature 1: Dynamic Accent Colour Engine E2E', () => {
  test('verifies lime (#84CC16) contrast & blue (#2563EB) persistence across storefront & admin at 1440px and 375px', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAdminViaApi(page);

    // Go to Admin > Settings > Branding
    await page.goto('/admin');
    await page.getByRole('button', { name: /settings/i }).click();
    await page.getByRole('button', { name: /branding/i }).click();
    await expect(page.locator('#accent-hex-input')).toBeVisible({ timeout: 10000 });

    // Before screenshot (default orange)
    await page.screenshot({ path: path.join(SHOTS_DIR, 'accent-before-orange.png'), fullPage: false });

    // 1. Test Lime #84CC16
    await page.locator('#accent-hex-input').fill('#84CC16');
    await expect(page.getByText('1.98:1 (needs 4.5:1)')).toBeVisible();
    await expect(page.getByText('1.98:1 (needs 3.0:1)')).toBeVisible();
    await expect(page.getByText(/Near-black label/i)).toBeVisible();
    const createBtnColors = await page.getByRole('button', { name: /Create/i }).evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, bg: s.backgroundColor };
    });
    expect(createBtnColors.color).not.toBe(createBtnColors.bg);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'accent-lime-84CC16.png'), fullPage: false });

    // 2. Test Cobalt Blue #2563EB, save, and reload
    await page.locator('#accent-hex-input').fill('#2563EB');
    await page.getByRole('button', { name: /save branding/i }).click();
    await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(SHOTS_DIR, 'accent-blue-2563EB.png'), fullPage: false });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify CSS variable & zero old orange rgb(255, 77, 0) on key storefront & admin pages
    const routesToCheck = ['/', '/shop', '/cart', '/checkout', '/track', '/quick-order', '/admin'];
    for (const vp of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(vp);
      for (const route of routesToCheck) {
        await page.goto(route);
        await page.waitForTimeout(400);

        const audit = await page.evaluate(() => {
          const accentVar = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
          const oldOrangeHits = [];
          const els = document.querySelectorAll('body *');
          for (const el of els) {
            const st = getComputedStyle(el);
            for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke']) {
              if (st[prop] === 'rgb(255, 77, 0)') {
                oldOrangeHits.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), prop });
              }
            }
          }
          return { accentVar, oldOrangeCount: oldOrangeHits.length, sample: oldOrangeHits.slice(0, 3) };
        });

        expect(audit.accentVar).toBe('37 99 235');
        expect(audit.oldOrangeCount, `Found old orange on ${route} @ ${vp.width}px: ${JSON.stringify(audit.sample)}`).toBe(0);
      }
    }

    // Verify public /api/branding returns #2563EB with no-cache
    const apiRes = await page.request.get('/api/branding');
    expect(apiRes.headers()['cache-control']).toBe('no-cache');
    const brandingJson = await apiRes.json();
    expect(brandingJson.data.accent_hex).toBe('#2563EB');

    expect(consoleErrors, `Console errors: ${consoleErrors.join('; ')}`).toHaveLength(0);
  });
});
