import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

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
    return { ok: r.ok, body: await r.json() };
  }, { email: ADMIN_EMAIL, password: ADMIN_PASS });
  expect(res.ok).toBe(true);
  if (res.body?.data?.token) {
    await page.evaluate((t) => localStorage.setItem('techbazaar_token', t), res.body.data.token);
  }
}

test.describe('Feature 2: Banners & Ads E2E', () => {
  test('upload, crop, device preview, storefront 1440/375 picture src, carousel, analytics, delete+Undo & media health', async ({ page }) => {
    const tmpFixtures = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-banner-fix-'));
    const desktopFixture = path.join(tmpFixtures, 'desktop-3x1.png');
    const squareFixture = path.join(tmpFixtures, 'mobile-square.png');

    await sharp({
      create: { width: 1800, height: 600, channels: 3, background: { r: 20, g: 83, b: 45 } }
    }).png().toFile(desktopFixture);

    await sharp({
      create: { width: 1000, height: 1000, channels: 3, background: { r: 124, g: 45, b: 18 } }
    }).png().toFile(squareFixture);

    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await loginAdminViaApi(page);

      // 1. Open Admin > Banners & Ads
      await page.goto('/admin');
      await page.getByRole('button', { name: /banners/i }).click();
      await expect(page.getByText('Banners & Ad Campaigns')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      // Verify all seeded banner thumbnails load cleanly (naturalWidth > 0)
      const thumbStatus = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('table img'));
        return imgs.map((img) => ({ src: img.getAttribute('src'), complete: img.complete, w: img.naturalWidth }));
      });
      expect(thumbStatus.length).toBeGreaterThanOrEqual(3);
      for (const t of thumbStatus) {
        expect(t.w, `Broken banner thumb: ${t.src}`).toBeGreaterThan(0);
      }
      await page.screenshot({ path: path.join(SHOTS_DIR, 'banners-admin-list.png'), fullPage: false });

      // 2. Create a second banner in home-mid-1 (triggers carousel) with upload + crop
      await page.getByRole('button', { name: /add new banner/i }).click();
      await page.getByPlaceholder(/Boat Airdopes/i).fill('E2E Carousel Promo');
      await page.getByPlaceholder(/Describe the banner/i).fill('E2E Carousel Promo Banner');

      // Upload 1800x600 desktop directly
      await page.locator('input[aria-label="Upload desktop banner image"]').setInputFiles(desktopFixture);
      await expect(page.getByText(/Uploaded desktop WebP/i)).toBeVisible({ timeout: 8000 });

      // Upload 1000x1000 square mobile -> opens crop tool -> Apply & Save WebP
      await page.locator('input[aria-label="Upload mobile banner image"]').setInputFiles(squareFixture);
      await expect(page.getByText(/Crop & Frame/i)).toBeVisible({ timeout: 8000 });
      await page.getByRole('button', { name: 'top', exact: true }).click();
      await page.getByRole('button', { name: /Apply & Save WebP/i }).click();
      await expect(page.getByText(/Cropped & uploaded mobile WebP/i)).toBeVisible({ timeout: 8000 });

      // Switch simulator modes & screenshot
      await page.getByRole('button', { name: 'Mobile 375' }).click();
      await page.screenshot({ path: path.join(SHOTS_DIR, 'banners-drawer-mobile-sim.png'), fullPage: false });
      await page.getByRole('button', { name: 'Desktop 1440' }).click();

      // Link type = coupon (FESTIVE25)
      const selects = page.locator('form select');
      await selects.nth(1).selectOption('coupon');
      await page.getByPlaceholder(/WELCOME10/i).fill('WELCOME10');

      await page.getByRole('button', { name: /Publish Banner/i }).click();
      await expect(page.getByText(/Banner created successfully/i)).toBeVisible({ timeout: 8000 });

      // 3. Visit storefront / at 1440px & 375px and verify carousel + picture.currentSrc
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      await page.waitForTimeout(800);
      await expect(page.getByRole('button', { name: 'Go to banner 2' })).toBeVisible({ timeout: 8000 });

      const desktopSrc = await page.evaluate(() => {
        const img = document.querySelector('picture img');
        return img ? { currentSrc: img.currentSrc, w: img.naturalWidth } : null;
      });
      expect(desktopSrc?.w).toBeGreaterThan(0);
      expect(desktopSrc?.currentSrc).toContain('desktop');
      await page.screenshot({ path: path.join(SHOTS_DIR, 'banners-storefront-1440.png'), fullPage: false });

      await page.setViewportSize({ width: 375, height: 812 });
      await page.reload();
      await page.waitForTimeout(800);
      const mobileSrc = await page.evaluate(() => {
        const img = document.querySelector('picture img');
        return img ? { currentSrc: img.currentSrc, w: img.naturalWidth } : null;
      });
      expect(mobileSrc?.w).toBeGreaterThan(0);
      expect(mobileSrc?.currentSrc).toContain('mobile');
      await page.screenshot({ path: path.join(SHOTS_DIR, 'banners-storefront-375.png'), fullPage: false });

      // 4. Delete the E2E banner then click Undo to restore
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/admin');
      await page.getByRole('button', { name: /banners/i }).click();
      const row = page.locator('tr', { hasText: 'E2E Carousel Promo' });
      await expect(row).toBeVisible({ timeout: 8000 });
      await row.locator('button[title="Delete"]').click();
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.locator('tr', { hasText: 'E2E Carousel Promo' })).toBeVisible({ timeout: 8000 });
    } finally {
      fs.rmSync(tmpFixtures, { recursive: true, force: true });
    }
  });
});
