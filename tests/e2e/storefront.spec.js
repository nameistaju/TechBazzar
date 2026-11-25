import { test, expect } from '@playwright/test';

test.describe('TechBazaar Storefront E2E', () => {
  test('Homepage loads cleanly with no console errors or horizontal overflow at 375px and 1440px', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    const overflow1440 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow1440).toBe(false);

    await page.setViewportSize({ width: 375, height: 812 });
    const overflow375 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow375).toBe(false);
    expect(errors).toEqual([]);
  });

  test('Shop page loads live products from API and filters work', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('h1')).toContainText(/All Electronics|Shop/i);
    await page.waitForSelector('a[href^="/product/"]', { timeout: 10000 });
    const count = await page.locator('a[href^="/product/"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Quick Order page has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/quick-order');
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('Retail checkout page shows Retail copy (no Wholesale Summary) and h1', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForSelector('button:has-text("Add to Bag")', { timeout: 10000 });
    await page.locator('button:has-text("Add to Bag")').first().click();
    await page.goto('/checkout');
    await expect(page.locator('h1')).toContainText(/Express Checkout/i);
    await expect(page.locator('body')).not.toContainText('Wholesale Summary');
  });
});
