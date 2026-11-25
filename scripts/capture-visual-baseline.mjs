import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function resolveArg(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const OUT_DIR = path.resolve(ROOT, resolveArg('--out', 'docs/refactor/baseline-screenshots'));
const PORT = Number(resolveArg('--port', '5019'));
const BASE_URL = `http://localhost:${PORT}`;

function resolvePaths() {
  const serverEntry = fs.existsSync(path.join(ROOT, 'apps/api/src/server.js'))
    ? path.join(ROOT, 'apps/api/src/server.js')
    : fs.existsSync(path.join(ROOT, 'apps/api/index.js'))
      ? path.join(ROOT, 'apps/api/index.js')
      : path.join(ROOT, 'server/index.js');

  const dbPath = fs.existsSync(path.join(ROOT, 'apps/api/db/techbazaar.db'))
    ? path.join(ROOT, 'apps/api/db/techbazaar.db')
    : path.join(ROOT, 'server/db/techbazaar.db');

  return { serverEntry, dbPath };
}

function copyTempDb(srcDbPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-visual-'));
  const destDb = path.join(tmpDir, 'techbazaar.db');
  fs.copyFileSync(srcDbPath, destDb);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(srcDbPath + suffix)) {
      fs.copyFileSync(srcDbPath + suffix, destDb + suffix);
    }
  }
  return { tmpDir, destDb };
}

async function waitForHealth(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}/api/health`);
}

async function settlePage(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(350);
}

async function shot(page, name, vpWidth) {
  const filePath = path.join(OUT_DIR, `${name}-${vpWidth}.png`);
  await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
  console.log(`Captured ${path.relative(ROOT, filePath)}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { serverEntry, dbPath } = resolvePaths();
  const { tmpDir, destDb } = copyTempDb(dbPath);

  // Ephemeral runtime-only credentials on the temporary DB copy
  const ephemeralAdminPass = crypto.randomBytes(18).toString('hex');
  const ephemeralBuyerPass = crypto.randomBytes(18).toString('hex');
  const buyerEmail = 'visual-baseline-buyer@example.com';

  const db = new Database(destDb);
  const adminRow = db.prepare("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminRow) throw new Error('No admin user found in temp DB');

  const adminHash = bcrypt.hashSync(ephemeralAdminPass, 8);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .run(adminHash, adminRow.id);

  const buyerHash = bcrypt.hashSync(ephemeralBuyerPass, 8);
  const existingBuyer = db.prepare('SELECT id FROM users WHERE email = ?').get(buyerEmail);
  if (existingBuyer) {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .run(buyerHash, existingBuyer.id);
  } else {
    db.prepare("INSERT INTO users (name, email, phone, password_hash, role, buyer_type, must_change_password) VALUES (?, ?, ?, ?, 'customer', 'retail', 0)")
      .run('Baseline Buyer', buyerEmail, '9876543210', buyerHash);
  }

  const sampleProduct = db.prepare('SELECT id FROM products LIMIT 1').get();
  if (!sampleProduct) throw new Error('No sample product found in temp DB');
  db.close();

  const serverProc = spawn(process.execPath, [serverEntry], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORT),
      CLIENT_URL: BASE_URL,
      TECHBAZAAR_DB_PATH: destDb,
      JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLogs = '';
  serverProc.stdout.on('data', (d) => { serverLogs += d.toString(); });
  serverProc.stderr.on('data', (d) => { serverLogs += d.toString(); });

  let browser;
  try {
    await waitForHealth(BASE_URL);
    browser = await chromium.launch({ channel: 'chrome', headless: true });

    const viewports = [
      { width: 375, height: 812 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      // 1. Public & Guest Shopping Flows
      const guestCtx = await browser.newContext({ viewport: vp });
      const page = await guestCtx.newPage();

      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'home', vp.width);

      await page.goto(`${BASE_URL}/shop`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'shop', vp.width);

      await page.goto(`${BASE_URL}/product/${sampleProduct.id}`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'product', vp.width);

      // Add item to bag and open cart drawer
      await page.goto(`${BASE_URL}/shop`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button:has-text("Add to Bag")', { timeout: 10000 });
      await page.locator('button:has-text("Add to Bag")').first().click();
      await page.waitForTimeout(300);

      const bagBtn = page.locator('header button[aria-label*="Shopping Bag" i]').first();
      await bagBtn.click();
      await page.waitForTimeout(350);
      await shot(page, 'cart-drawer', vp.width);

      await page.goto(`${BASE_URL}/cart`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'cart-page', vp.width);

      await page.goto(`${BASE_URL}/quick-order`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'quick-order', vp.width);

      await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'checkout', vp.width);

      // Place guest order -> /order-success
      await page.locator('input[placeholder*="Aarav" i], input[name="name"]').first().fill('Baseline Buyer');
      await page.locator('input[type="email"]').first().fill(`vb_${vp.width}_${Date.now()}@example.com`);
      await page.locator('input[type="tel"]').first().fill('9876543210');
      await page.locator('input[placeholder*="Brigade" i], input[name="addressLine"]').first().fill('100 MG Road');
      await page.locator('input[placeholder*="Bengaluru" i], input[name="city"]').first().fill('Bengaluru');
      await page.locator('input[placeholder*="560" i], input[name="pincode"]').first().fill('560001');
      await page.locator('button:has-text("Continue to Payment"), button:has-text("Next")').first().click();
      await page.locator('button:has-text("Review"), button:has-text("Continue")').first().click();
      await page.locator('button:has-text("Confirm Order")').first().click();
      await page.waitForURL(/\/order-success\/TB-/, { timeout: 15000 });
      await settlePage(page);
      await shot(page, 'order-success', vp.width);

      await page.goto(`${BASE_URL}/track`, { waitUntil: 'domcontentloaded' });
      await settlePage(page);
      await shot(page, 'track', vp.width);

      await guestCtx.close();

      // 2. Buyer Account View
      const buyerCtx = await browser.newContext({ viewport: vp });
      const buyerPage = await buyerCtx.newPage();
      const buyerLogin = await buyerPage.request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: buyerEmail, password: ephemeralBuyerPass },
      });
      if (!buyerLogin.ok()) {
        throw new Error(`Buyer login failed: ${buyerLogin.status()} ${await buyerLogin.text()}`);
      }
      await buyerPage.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded' });
      await settlePage(buyerPage);
      await shot(buyerPage, 'account', vp.width);
      await buyerCtx.close();

      // 3. Admin Back-Office Views
      const adminCtx = await browser.newContext({ viewport: vp });
      const adminPage = await adminCtx.newPage();
      const adminLogin = await adminPage.request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: adminRow.email, password: ephemeralAdminPass },
      });
      if (!adminLogin.ok()) {
        throw new Error(`Admin login failed: ${adminLogin.status()} ${await adminLogin.text()}`);
      }
      await adminPage.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
      await settlePage(adminPage);
      await shot(adminPage, 'admin-dashboard', vp.width);

      const navClick = async (label) => {
        if (vp.width < 768) {
          await adminPage.locator('button[aria-label="Toggle Navigation"]').click();
          await adminPage.waitForTimeout(250);
        }
        await adminPage.locator(`nav button:has-text("${label}"), aside button:has-text("${label}")`).first().click();
        await settlePage(adminPage);
      };

      await navClick('Products');
      await shot(adminPage, 'admin-products', vp.width);

      await navClick('Orders');
      await shot(adminPage, 'admin-orders', vp.width);

      await adminCtx.close();
    }
  } catch (err) {
    console.error('Server logs before failure:\n', serverLogs);
    throw err;
  } finally {
    if (browser) await browser.close();
    if (!serverProc.killed) {
      serverProc.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        serverProc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore transient Windows file lock on temp dir cleanup
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
