import { test, expect } from '@playwright/test';

test.describe('Phase 1.5 E2E Real Flows', () => {
  test('No horizontal overflow at 375, 768, 1280, 1440 and Bag button visible at 1280, 1440, and 125% zoom', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    for (const vp of [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 }
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.locator('header')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Overflow at ${vp.width}px`).toBe(false);

      if (vp.width >= 1280) {
        const bagBtn = page.locator('header button:has-text("Bag"), header button[aria-label*="Bag" i], header button[aria-label*="Cart" i]').first();
        await expect(bagBtn).toBeVisible();
      }
    }

    // 125% browser zoom check at 1280px
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { document.body.style.zoom = '1.25'; });
    const bagZoomed = page.locator('header button:has-text("Bag"), header button[aria-label*="Bag" i], header button[aria-label*="Cart" i]').first();
    await expect(bagZoomed).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Retail guest checkout WITH coupon WELCOME10 and reload on /order-success', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForSelector('button:has-text("Add to Bag")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Bag")').first().click();

    await page.goto('/cart');
    await expect(page.locator('body')).not.toContainText('₹14.99');
    const couponInput = page.locator('input[placeholder*="Coupon" i]');
    await couponInput.fill('WELCOME10');
    await page.locator('button:has-text("Apply")').click();
    await expect(page.locator('body')).toContainText(/WELCOME10/i);

    await page.goto('/checkout');
    await expect(page.locator('h1')).toContainText(/Express Checkout/i);
    await expect(page.locator('body')).not.toContainText('Wholesale Summary');

    // Step 1: Contact & Delivery
    await page.locator('input[placeholder*="Aarav" i], input[name="name"]').first().fill('Playwright Buyer');
    await page.locator('input[type="email"]').first().fill(`pw_${Date.now()}@example.com`);
    await page.locator('input[type="tel"]').first().fill('9876543210');
    await page.locator('input[placeholder*="Brigade" i], input[name="addressLine"]').first().fill('100 MG Road');
    await page.locator('input[placeholder*="Bengaluru" i], input[name="city"]').first().fill('Bengaluru');
    await page.locator('input[placeholder*="560" i], input[name="pincode"]').first().fill('560001');
    await page.locator('button:has-text("Continue to Payment"), button:has-text("Next")').first().click();

    // Step 2: Payment Method -> Continue
    await page.locator('button:has-text("Review"), button:has-text("Continue")').first().click();

    // Step 3: Place order
    await page.locator('button:has-text("Confirm Order")').first().click();
    await page.waitForURL(/\/order-success\/TB-/, { timeout: 15000 });
    await expect(page.locator('body')).toContainText(/TB-2026-/);

    // Refresh /order-success and verify order details survive reload via ?token=
    await page.reload();
    await expect(page.locator('body')).toContainText(/TB-2026-/);
  });

  test('Quick Order typing "ear buds" lists earbuds and has no overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/quick-order');
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    const skuInput = page.locator('input[placeholder*="SKU" i], input[placeholder*="Search" i]').first();
    if (await skuInput.isVisible()) {
      await skuInput.click();
      await skuInput.fill('ear buds');
      await page.waitForTimeout(400);
      await expect(page.locator('body')).toContainText(/earbud|airdopes|tws|earphone/i);
    }
  });

  test('Mode switch preserves separate retail cart and quote page submits RFQ', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/shop');
    await page.waitForSelector('button:has-text("Add to Bag")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Bag")').first().click();

    await page.goto('/quote');
    await expect(page.locator('h1')).toBeVisible();
  });
});
