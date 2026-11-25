// server/routes/admin.js
// TechBazaar Single-Owner Business Back-Office Router

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db/index.js';
import { requireAdmin, COOKIE_OPTIONS, generateToken } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { validateImageUpload } from '../utils/imageSecurity.js';
import * as adminSchemas from '../validators/adminSchemas.js';
import { formatProduct } from './products.js';
import { 
  formatINR, 
  formatMoney,
  numberToWordsIndian, 
  calculateLineItem, 
  calculateDocumentTotals, 
  evaluateDiscount 
} from '../services/calculation.js';
import { generateDocumentPDF } from '../services/pdfGenerator.js';
import { 
  findDuplicateGroups, 
  mergeProductGroup, 
  undoMerge, 
  checkDuplicateName 
} from '../services/dedupService.js';

const router = Router();

// Protect all admin routes
router.use(requireAdmin);

// ==========================================
// HELPERS: ACTIVITY LOG & COUNTERS
// ==========================================

function logActivity(action, entityType, entityId, details, beforeState = null, afterState = null, undoable = false) {
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_log (action, entity_type, entity_id, details, before_state, after_state, undoable, undone)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    stmt.run(
      action,
      entityType,
      String(entityId),
      details,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      undoable ? 1 : 0
    );
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

function getNextSequence(name, prefix = '', padLength = 4) {
  const nextVal = db.transaction(() => {
    let current = db.prepare('SELECT current_value FROM counters WHERE name = ?').get(name);
    let val = current ? current.current_value : 1;

    if (name === 'invoice') {
      const existing = db.prepare('SELECT invoice_number FROM invoices').all();
      for (const row of existing) {
        if (row.invoice_number && row.invoice_number.startsWith(prefix)) {
          const numPart = parseInt(row.invoice_number.slice(prefix.length), 10);
          if (!isNaN(numPart) && numPart >= val) {
            val = numPart + 1;
          }
        }
      }
    } else if (name === 'estimate') {
      const existing = db.prepare('SELECT estimate_number FROM estimates').all();
      for (const row of existing) {
        if (row.estimate_number && row.estimate_number.startsWith(prefix)) {
          const numPart = parseInt(row.estimate_number.slice(prefix.length), 10);
          if (!isNaN(numPart) && numPart >= val) {
            val = numPart + 1;
          }
        }
      }
    }

    db.prepare(`
      INSERT INTO counters (name, current_value) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET current_value = ?
    `).run(name, val + 1, val + 1);
    return val;
  })();

  return `${prefix}${String(nextVal).padStart(padLength, '0')}`;
}

function getSettingsMap() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

// ==========================================
// 1. ADMIN ACCOUNT & PROFILE
// ==========================================

// GET /api/admin/me
router.get('/me', (req, res) => {
  const adminUser = db.prepare('SELECT id, email, name, role, must_change_password, created_at FROM users WHERE id = ?').get(req.user.id);
  return res.json({ data: { admin: adminUser }, error: null });
});

const COMMON_WEAK_PASSWORDS = new Set([
  'admin12345', 'password123', 'password1234', '1234567890', 'qwerty12345',
  'techbazaar', 'techbazaar123', 'letmein1234', 'welcome1234', 'changeme123'
]);

// POST /api/admin/change-password
router.post('/change-password', validateBody(adminSchemas.changePasswordSchema), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT id, email, role, password_hash, token_version FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ data: null, error: 'Admin account not found.' });
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ data: null, error: 'Current password is incorrect.' });
  }

  if (newPassword.trim().toLowerCase() === user.email.toLowerCase()) {
    return res.status(400).json({ data: null, error: 'New password cannot be the same as your email address.' });
  }

  if (COMMON_WEAK_PASSWORDS.has(newPassword.trim().toLowerCase())) {
    return res.status(400).json({ data: null, error: 'Please choose a stronger password (too common).' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  const newTokenVersion = (user.token_version ?? 0) + 1;
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, token_version = ? WHERE id = ?')
    .run(newHash, newTokenVersion, req.user.id);

  // Re-issue cookie for current session so admin stays signed in while all other sessions are invalidated
  const token = generateToken({ ...user, token_version: newTokenVersion });
  res.cookie('token', token, COOKIE_OPTIONS);

  logActivity('update', 'admin', req.user.id, 'Admin password changed and other sessions invalidated');
  return res.json({ data: { message: 'Password updated successfully' }, error: null });
});

// PATCH /api/admin/profile
router.patch('/profile', validateBody(adminSchemas.updateProfileSchema), (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ data: null, error: 'Name and email are required.' });
  }

  const before = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), email.trim().toLowerCase(), req.user.id);
  const after = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);

  // Re-issue token with new email if changed
  const token = generateToken({ ...req.user, email: after.email, name: after.name });
  res.cookie('token', token, COOKIE_OPTIONS);

  logActivity('update', 'admin', req.user.id, `Updated admin profile to ${after.name} (${after.email})`, before, after);
  return res.json({ data: { admin: after }, error: null });
});

// POST /api/admin/forgot-password (mock flow for single owner)
router.post('/forgot-password', (req, res) => {
  return res.json({
    data: {
      message: 'Password reset link and verification code sent to owner registered email.'
    },
    error: null
  });
});

// ==========================================
// 2. DASHBOARD & ANALYTICS
// ==========================================

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const { range = '30d' } = req.query;

  let days = 30;
  if (range === 'today') days = 1;
  else if (range === '7d') days = 7;
  else if (range === '90d') days = 90;

  // 1. Total revenue & channel breakdown
  const revRow = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) as revenue,
      COALESCE(SUM(CASE WHEN COALESCE(channel, 'retail') != 'wholesale' THEN total ELSE 0 END), 0) as retailRevenue,
      COALESCE(SUM(CASE WHEN channel = 'wholesale' THEN total ELSE 0 END), 0) as wholesaleRevenue,
      COUNT(CASE WHEN COALESCE(channel, 'retail') != 'wholesale' THEN 1 END) as retailOrders,
      COUNT(CASE WHEN channel = 'wholesale' THEN 1 END) as wholesaleOrders
    FROM orders WHERE status != 'Cancelled'
  `).get();
  const revenue = revRow.revenue;
  const retailRevenue = revRow.retailRevenue;
  const wholesaleRevenue = revRow.wholesaleRevenue;
  const retailOrders = revRow.retailOrders;
  const wholesaleOrders = revRow.wholesaleOrders;

  // 2. Order counts
  const totalOrdersRow = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  const totalOrders = totalOrdersRow.count;

  // 3. Pending orders & pending wholesale applications
  const pendingRow = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('Placed', 'Packed')").get();
  const pendingOrders = pendingRow.count;
  const pendingWsRow = db.prepare("SELECT COUNT(*) as count FROM wholesale_applications WHERE status = 'pending'").get();
  const pendingWholesaleApps = pendingWsRow ? pendingWsRow.count : 0;

  // 4. Low stock count (<= 3 or low_stock_threshold)
  const lowStockRow = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= COALESCE(low_stock_threshold, 3) AND deleted_at IS NULL').get();
  const lowStockCount = lowStockRow.count;

  // 5. Total customers
  const custRow = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  const totalCustomers = custRow.count;

  // 6. Unpaid invoices
  const unpaidInvRow = db.prepare("SELECT COALESCE(SUM(balance_due), 0) as balance, COUNT(*) as count FROM invoices WHERE status IN ('Unpaid', 'Partially paid')").get();
  const unpaidInvoicesAmount = unpaidInvRow.balance;
  const unpaidInvoicesCount = unpaidInvRow.count;

  // 7. Average order value (AOV)
  const aov = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

  // 8. Orders & Revenue timeline (single grouped SQL query)
  const startD = new Date();
  startD.setDate(startD.getDate() - (days - 1));
  const startDateStr = startD.toISOString().split('T')[0];

  const groupedRows = db.prepare(`
    SELECT DATE(created_at) as d, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE DATE(created_at) >= DATE(?) AND status != 'Cancelled'
    GROUP BY DATE(created_at)
  `).all(startDateStr);
  const byDate = Object.fromEntries(groupedRows.map(r => [r.d, r]));

  const timeline = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const row = byDate[dateStr];
    timeline.push({
      date: dateStr,
      label,
      orders: row?.orders || 0,
      revenue: row?.revenue || 0
    });
  }

  // 9. Sales by Category
  const categorySplit = db.prepare(`
    SELECT p.category, SUM(oi.quantity) as units_sold, SUM(oi.price * oi.quantity) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'Cancelled'
    GROUP BY p.category
    ORDER BY revenue DESC
    LIMIT 6
  `).all();

  // 10. Payment Method Split
  const paymentSplit = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(total) as revenue
    FROM orders
    WHERE status != 'Cancelled'
    GROUP BY payment_method
  `).all();

  // 11. Top products
  const topProducts = db.prepare(`
    SELECT oi.product_id, oi.product_name, oi.image, SUM(oi.quantity) as units_sold, SUM(oi.price * oi.quantity) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'Cancelled'
    GROUP BY oi.product_id
    ORDER BY units_sold DESC
    LIMIT 5
  `).all();

  // 12. Low stock alert list
  const lowStockAlerts = db.prepare(`
    SELECT id, name, sku, category, stock, low_stock_threshold, price, image
    FROM products
    WHERE stock <= COALESCE(low_stock_threshold, 3) AND deleted_at IS NULL
    ORDER BY stock ASC
    LIMIT 6
  `).all();

  // 13. Recent Orders
  const recentOrders = db.prepare(`
    SELECT id, order_number, guest_name, guest_email, total, status, payment_method, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 6
  `).all();

  // 14. Recent Invoices
  const recentInvoices = db.prepare(`
    SELECT id, invoice_number, customer_name, invoice_date, total, balance_due, status
    FROM invoices
    ORDER BY created_at DESC
    LIMIT 6
  `).all();

  return res.json({
    data: {
      revenue,
      retailRevenue,
      wholesaleRevenue,
      retailOrders,
      wholesaleOrders,
      pendingWholesaleApps,
      totalOrders,
      pendingOrders,
      lowStockCount,
      totalCustomers,
      unpaidInvoicesAmount,
      unpaidInvoicesCount,
      aov,
      timeline,
      categorySplit,
      paymentSplit,
      topProducts,
      lowStockAlerts,
      recentOrders,
      recentInvoices
    },
    error: null
  });
});

// ==========================================
// 3. PRODUCTS MANAGEMENT
// ==========================================

// GET /api/admin/products/images (Scan /public/images for visual picker)
router.get('/products/images', (req, res) => {
  const imagesDir = path.resolve('public/images');
  try {
    const files = fs.readdirSync(imagesDir);
    const validImages = files
      .filter(f => /\.(jpe?g|png|webp|svg)$/i.test(f) && !f.endsWith('.woff2'))
      .map(f => ({
        filename: f,
        path: `/images/${f}`,
        name: f.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      }));

    return res.json({ data: { images: validImages }, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: 'Could not load local images directory.' });
  }
});

// GET /api/admin/products/duplicates
router.get('/products/duplicates', (req, res) => {
  try {
    const groups = findDuplicateGroups();
    return res.json({
      data: {
        groups,
        totalGroups: groups.length,
        totalDuplicates: groups.reduce((acc, g) => acc + (g.duplicates ? g.duplicates.length : 0), 0)
      },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/admin/products/merge
router.post('/products/merge', validateBody(adminSchemas.mergeProductsSchema), (req, res) => {
  const { canonicalId, duplicateIds } = req.body;
  if (!canonicalId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
    return res.status(400).json({ data: null, error: 'canonicalId and duplicateIds array are required.' });
  }

  try {
    const result = mergeProductGroup(canonicalId, duplicateIds);
    return res.json({ data: result, error: null });
  } catch (err) {
    return res.status(400).json({ data: null, error: err.message });
  }
});

// POST /api/admin/products/merge-all
router.post('/products/merge-all', (req, res) => {
  try {
    const groups = findDuplicateGroups();
    const results = [];
    let mergedTotal = 0;

    for (const g of groups) {
      if (g.canonicalId && g.duplicates?.length > 0) {
        const dupIds = g.duplicates.map(d => d.id);
        const res = mergeProductGroup(g.canonicalId, dupIds);
        results.push(res);
        mergedTotal += dupIds.length;
      }
    }

    return res.json({
      data: {
        mergedGroupsCount: results.length,
        mergedProductsCount: mergedTotal,
        results
      },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/admin/products
router.get('/products', validateQuery(adminSchemas.adminProductsQuerySchema), (req, res) => {
  const {
    search,
    category,
    brand,
    status = 'all',
    stockLevel,
    flag,
    sort = 'created_at_desc',
    includeDeleted = 'false',
    limit = 100,
    offset = 0
  } = req.validatedQuery;
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (includeDeleted !== 'true') {
    query += ' AND deleted_at IS NULL';
  }

  if (search) {
    query += ' AND (name LIKE ? OR brand LIKE ? OR sku LIKE ? OR id LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (category && category !== 'all') {
    query += ' AND LOWER(category) = LOWER(?)';
    params.push(category);
  }

  if (brand && brand !== 'all') {
    query += ' AND LOWER(brand) = LOWER(?)';
    params.push(brand);
  }

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (stockLevel === 'out') {
    query += ' AND stock = 0';
  } else if (stockLevel === 'low') {
    query += ' AND stock > 0 AND stock <= COALESCE(low_stock_threshold, 3)';
  } else if (stockLevel === 'in') {
    query += ' AND stock > COALESCE(low_stock_threshold, 3)';
  }

  if (flag === 'flashSale') query += ' AND is_flash_sale = 1';
  if (flag === 'trending') query += ' AND is_trending = 1';
  if (flag === 'bestseller') query += ' AND is_bestseller = 1';
  if (flag === 'new') query += ' AND is_new = 1';
  if (flag === 'recommended') query += ' AND is_recommended = 1';
  if (flag === 'featuredHero') query += ' AND featured_hero = 1';

  // Sorting
  if (sort === 'price_asc') query += ' ORDER BY price ASC';
  else if (sort === 'price_desc') query += ' ORDER BY price DESC';
  else if (sort === 'stock_asc') query += ' ORDER BY stock ASC';
  else if (sort === 'stock_desc') query += ' ORDER BY stock DESC';
  else if (sort === 'name_asc') query += ' ORDER BY name ASC';
  else query += ' ORDER BY rowid DESC';

  query += ' LIMIT ? OFFSET ?';
  params.push(safeLimit, safeOffset);

  const rows = db.prepare(query).all(...params);

  // Total count
  let countQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
  const countParams = [];
  if (includeDeleted !== 'true') countQuery += ' AND deleted_at IS NULL';
  if (search) {
    countQuery += ' AND (name LIKE ? OR brand LIKE ? OR sku LIKE ? OR id LIKE ?)';
    const term = `%${search.trim()}%`;
    countParams.push(term, term, term, term);
  }
  if (category && category !== 'all') {
    countQuery += ' AND LOWER(category) = LOWER(?)';
    countParams.push(category);
  }
  const totalCount = db.prepare(countQuery).get(...countParams)?.count || 0;

  // Format products
  const formatted = rows.map(r => ({
    ...formatProduct(r),
    sku: r.sku,
    costPrice: r.cost_price,
    mrp: r.mrp,
    gstRate: r.gst_rate,
    isTaxInclusive: Boolean(r.is_tax_inclusive),
    lowStockThreshold: r.low_stock_threshold,
    trackInventory: Boolean(r.track_inventory),
    allowBackorder: Boolean(r.allow_backorder),
    supplier: r.supplier,
    status: r.status,
    images: r.images ? JSON.parse(r.images) : [r.image],
    variants: r.variants ? JSON.parse(r.variants) : [],
    seo: r.seo ? JSON.parse(r.seo) : {},
    salePrice: r.sale_price,
    saleStartsAt: r.sale_starts_at,
    saleEndsAt: r.sale_ends_at,
    featuredHero: Boolean(r.featured_hero),
    deletedAt: r.deleted_at
  }));

  return res.json({
    data: {
      products: formatted,
      total: totalCount,
      limit: Number(limit),
      offset: Number(offset)
    },
    error: null
  });
});

// GET /api/admin/products/:id
router.get('/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ data: null, error: 'Product not found.' });
  }

  const product = {
    ...formatProduct(row),
    sku: row.sku,
    costPrice: row.cost_price,
    mrp: row.mrp,
    gstRate: row.gst_rate,
    isTaxInclusive: Boolean(row.is_tax_inclusive),
    lowStockThreshold: row.low_stock_threshold,
    trackInventory: Boolean(row.track_inventory),
    allowBackorder: Boolean(row.allow_backorder),
    supplier: row.supplier,
    status: row.status,
    images: row.images ? JSON.parse(row.images) : [row.image],
    variants: row.variants ? JSON.parse(row.variants) : [],
    seo: row.seo ? JSON.parse(row.seo) : {},
    salePrice: row.sale_price,
    saleStartsAt: row.sale_starts_at,
    saleEndsAt: row.sale_ends_at,
    featuredHero: Boolean(row.featured_hero),
    deletedAt: row.deleted_at
  };

  return res.json({ data: { product }, error: null });
});

// POST /api/admin/products
router.post('/products', validateBody(adminSchemas.createProductSchema), (req, res) => {
  const p = req.body;
  if (!p.name || !p.price || !p.category) {
    return res.status(400).json({ data: null, error: 'Name, price, and category are required.' });
  }

  const id = p.id || `tb-prod-${Date.now()}`;
  const catCode = (p.category || 'GEN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const sku = p.sku || `TB-${catCode}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const costPrice = p.costPrice || Math.round(p.price * 0.65);
  const mrp = p.mrp || Math.round(p.price * 1.25);
  const primaryImage = (p.images && p.images[0]) || p.image || '/images/image-1.webp';
  const imagesJson = JSON.stringify(p.images && p.images.length > 0 ? p.images : [primaryImage]);

  const moq = p.moq ? Number(p.moq) : 10;
  const packSize = p.packSize ? Number(p.packSize) : 5;
  const tier1Qty = p.tier1Qty ? Number(p.tier1Qty) : moq;
  const tier1Price = p.tier1Price ? Number(p.tier1Price) : Number(p.price);
  const tier2Qty = p.tier2Qty ? Number(p.tier2Qty) : 50;
  const tier2Price = p.tier2Price ? Number(p.tier2Price) : Math.round(Number(p.price) * 0.9);
  const tier3Qty = p.tier3Qty ? Number(p.tier3Qty) : 100;
  const tier3Price = p.tier3Price ? Number(p.tier3Price) : Math.round(Number(p.price) * 0.8);
  const suggestedRetail = p.suggestedRetailPrice ? Number(p.suggestedRetailPrice) : mrp;

  const insert = db.prepare(`
    INSERT INTO products (
      id, name, brand, category, price, original_price, cost_price, mrp,
      sku, gst_rate, is_tax_inclusive, stock, low_stock_threshold, track_inventory,
      allow_backorder, supplier, status, image, images, variants, specs, tags,
      short_description, is_flash_sale, is_trending, is_bestseller, is_new,
      is_recommended, featured_hero, sale_price, sale_starts_at, sale_ends_at, seo,
      moq, pack_size, tier1_qty, tier1_price, tier2_qty, tier2_price, tier3_qty, tier3_price, suggested_retail_price
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insert.run(
    id,
    p.name.trim(),
    p.brand ? p.brand.trim() : 'TechBazaar',
    p.category,
    Number(p.price),
    p.originalPrice ? Number(p.originalPrice) : mrp,
    costPrice,
    mrp,
    sku,
    p.gstRate !== undefined ? Number(p.gstRate) : 18,
    p.isTaxInclusive !== false ? 1 : 0,
    Number(p.stock) || 0,
    p.lowStockThreshold !== undefined ? Number(p.lowStockThreshold) : 3,
    p.trackInventory !== false ? 1 : 0,
    p.allowBackorder ? 1 : 0,
    p.supplier || 'TechBazaar Direct',
    p.status || 'active',
    primaryImage,
    imagesJson,
    JSON.stringify(p.variants || []),
    JSON.stringify(p.specs || {}),
    JSON.stringify(p.tags || []),
    p.shortDescription || '',
    p.isFlashSale ? 1 : 0,
    p.isTrending ? 1 : 0,
    p.isBestseller ? 1 : 0,
    p.isNew ? 1 : 0,
    p.isRecommended ? 1 : 0,
    p.featuredHero ? 1 : 0,
    p.salePrice ? Number(p.salePrice) : null,
    p.saleStartsAt || null,
    p.saleEndsAt || null,
    JSON.stringify(p.seo || {}),
    moq,
    packSize,
    tier1Qty,
    tier1Price,
    tier2Qty,
    tier2Price,
    tier3Qty,
    tier3Price,
    suggestedRetail
  );

  // Log stock movement if initial stock > 0
  if (p.stock > 0) {
    db.prepare(`
      INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, notes)
      VALUES (?, ?, 0, ?, 'restock', 'Initial stock allocation')
    `).run(id, Number(p.stock), Number(p.stock));
  }

  logActivity('create', 'product', id, `Created product "${p.name}" (SKU: ${sku})`, null, p);

  return res.status(201).json({
    data: { id, sku, message: 'Product created successfully' },
    error: null
  });
});

// PATCH /api/admin/products/:id
router.patch('/products/:id', validateBody(adminSchemas.updateProductSchema), (req, res) => {
  const p = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Product not found.' });
  }

  const updates = [];
  const params = [];

  if (p.name !== undefined) { updates.push('name = ?'); params.push(p.name.trim()); }
  if (p.brand !== undefined) { updates.push('brand = ?'); params.push(p.brand.trim()); }
  if (p.category !== undefined) { updates.push('category = ?'); params.push(p.category); }
  if (p.price !== undefined) { updates.push('price = ?'); params.push(Number(p.price)); }
  if (p.originalPrice !== undefined) { updates.push('original_price = ?'); params.push(Number(p.originalPrice)); }
  if (p.costPrice !== undefined) { updates.push('cost_price = ?'); params.push(Number(p.costPrice)); }
  if (p.mrp !== undefined) { updates.push('mrp = ?'); params.push(Number(p.mrp)); }
  if (p.sku !== undefined) { updates.push('sku = ?'); params.push(p.sku.trim()); }
  if (p.gstRate !== undefined) { updates.push('gst_rate = ?'); params.push(Number(p.gstRate)); }
  if (p.isTaxInclusive !== undefined) { updates.push('is_tax_inclusive = ?'); params.push(p.isTaxInclusive ? 1 : 0); }
  if (p.lowStockThreshold !== undefined) { updates.push('low_stock_threshold = ?'); params.push(Number(p.lowStockThreshold)); }
  if (p.trackInventory !== undefined) { updates.push('track_inventory = ?'); params.push(p.trackInventory ? 1 : 0); }
  if (p.allowBackorder !== undefined) { updates.push('allow_backorder = ?'); params.push(p.allowBackorder ? 1 : 0); }
  if (p.supplier !== undefined) { updates.push('supplier = ?'); params.push(p.supplier); }
  if (p.status !== undefined) { updates.push('status = ?'); params.push(p.status); }
  if (p.image !== undefined) { updates.push('image = ?'); params.push(p.image); }
  if (p.images !== undefined) { updates.push('images = ?'); params.push(JSON.stringify(p.images)); }
  if (p.variants !== undefined) { updates.push('variants = ?'); params.push(JSON.stringify(p.variants)); }
  if (p.specs !== undefined) { updates.push('specs = ?'); params.push(JSON.stringify(p.specs)); }
  if (p.tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(p.tags)); }
  if (p.shortDescription !== undefined) { updates.push('short_description = ?'); params.push(p.shortDescription); }
  if (p.isFlashSale !== undefined) { updates.push('is_flash_sale = ?'); params.push(p.isFlashSale ? 1 : 0); }
  if (p.isTrending !== undefined) { updates.push('is_trending = ?'); params.push(p.isTrending ? 1 : 0); }
  if (p.isBestseller !== undefined) { updates.push('is_bestseller = ?'); params.push(p.isBestseller ? 1 : 0); }
  if (p.isNew !== undefined) { updates.push('is_new = ?'); params.push(p.isNew ? 1 : 0); }
  if (p.isRecommended !== undefined) { updates.push('is_recommended = ?'); params.push(p.isRecommended ? 1 : 0); }
  if (p.featuredHero !== undefined) { updates.push('featured_hero = ?'); params.push(p.featuredHero ? 1 : 0); }
  if (p.salePrice !== undefined) { updates.push('sale_price = ?'); params.push(p.salePrice ? Number(p.salePrice) : null); }
  if (p.saleStartsAt !== undefined) { updates.push('sale_starts_at = ?'); params.push(p.saleStartsAt); }
  if (p.saleEndsAt !== undefined) { updates.push('sale_ends_at = ?'); params.push(p.saleEndsAt); }
  if (p.seo !== undefined) { updates.push('seo = ?'); params.push(JSON.stringify(p.seo)); }
  if (p.moq !== undefined) { updates.push('moq = ?'); params.push(Number(p.moq)); }
  if (p.packSize !== undefined || p.pack_size !== undefined) { updates.push('pack_size = ?'); params.push(Number(p.packSize !== undefined ? p.packSize : p.pack_size)); }
  if (p.tier1Qty !== undefined || p.tier1_qty !== undefined) { updates.push('tier1_qty = ?'); params.push(Number(p.tier1Qty !== undefined ? p.tier1Qty : p.tier1_qty)); }
  if (p.tier1Price !== undefined || p.tier1_price !== undefined) { updates.push('tier1_price = ?'); params.push(Number(p.tier1Price !== undefined ? p.tier1Price : p.tier1_price)); }
  if (p.tier2Qty !== undefined || p.tier2_qty !== undefined) { updates.push('tier2_qty = ?'); params.push(Number(p.tier2Qty !== undefined ? p.tier2Qty : p.tier2_qty)); }
  if (p.tier2Price !== undefined || p.tier2_price !== undefined) { updates.push('tier2_price = ?'); params.push(Number(p.tier2Price !== undefined ? p.tier2Price : p.tier2_price)); }
  if (p.tier3Qty !== undefined || p.tier3_qty !== undefined) { updates.push('tier3_qty = ?'); params.push(Number(p.tier3Qty !== undefined ? p.tier3Qty : p.tier3_qty)); }
  if (p.tier3Price !== undefined || p.tier3_price !== undefined) { updates.push('tier3_price = ?'); params.push(Number(p.tier3Price !== undefined ? p.tier3Price : p.tier3_price)); }
  if (p.suggestedRetailPrice !== undefined || p.suggested_retail_price !== undefined) { updates.push('suggested_retail_price = ?'); params.push(Number(p.suggestedRetailPrice !== undefined ? p.suggestedRetailPrice : p.suggested_retail_price)); }

  // Stock update with movement logging
  if (p.stock !== undefined && Number(p.stock) !== existing.stock) {
    const newStock = Number(p.stock);
    const diff = newStock - existing.stock;
    updates.push('stock = ?');
    params.push(newStock);

    db.prepare(`
      INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      existing.id,
      diff,
      existing.stock,
      newStock,
      p.stockReason || 'correction',
      p.stockNotes || 'Manual admin product update'
    );
  }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  const undoable = p.price !== undefined || p.stock !== undefined || p.status !== undefined;
  logActivity('update', 'product', req.params.id, `Updated product "${updated.name}"`, existing, updated, undoable);

  return res.json({ data: { product: formatProduct(updated) }, error: null });
});

// POST /api/admin/products/:id/duplicate
router.post('/products/:id/duplicate', (req, res) => {
  const source = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!source) {
    return res.status(404).json({ data: null, error: 'Product not found.' });
  }

  const newId = `tb-prod-${Date.now()}`;
  const catCode = (source.category || 'GEN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const newSku = `TB-${catCode}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const newName = `Copy of ${source.name}`;

  db.prepare(`
    INSERT INTO products (
      id, name, brand, category, price, original_price, cost_price, mrp,
      sku, gst_rate, is_tax_inclusive, stock, low_stock_threshold, track_inventory,
      allow_backorder, supplier, status, image, images, variants, specs, tags,
      short_description, is_flash_sale, is_trending, is_bestseller, is_new,
      is_recommended, featured_hero, seo
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, 'draft', ?, ?, ?, ?, ?,
      ?, 0, 0, 0, 1,
      0, 0, ?
    )
  `).run(
    newId, newName, source.brand, source.category, source.price, source.original_price, source.cost_price, source.mrp,
    newSku, source.gst_rate, source.is_tax_inclusive, source.stock, source.low_stock_threshold, source.track_inventory,
    source.allow_backorder, source.supplier, source.image, source.images, source.variants, source.specs, source.tags,
    source.short_description, source.seo
  );

  logActivity('create', 'product', newId, `Duplicated from "${source.name}" to "${newName}"`);
  return res.json({ data: { id: newId, sku: newSku }, error: null });
});

// DELETE /api/admin/products/:id (Soft delete)
router.delete('/products/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) {
    return res.status(404).json({ data: null, error: 'Product not found.' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE products SET deleted_at = ?, status = 'archived' WHERE id = ?").run(now, p.id);
  logActivity('delete', 'product', p.id, `Archived/soft-deleted product "${p.name}"`, p, { ...p, deleted_at: now }, true);

  return res.json({ data: { message: 'Product archived successfully' }, error: null });
});

// POST /api/admin/products/:id/restore
router.post('/products/:id/restore', (req, res) => {
  db.prepare("UPDATE products SET deleted_at = NULL, status = 'active' WHERE id = ?").run(req.params.id);
  logActivity('update', 'product', req.params.id, `Restored archived product ${req.params.id}`);
  return res.json({ data: { message: 'Product restored successfully' }, error: null });
});

// POST /api/admin/products/bulk
router.post('/products/bulk', validateBody(adminSchemas.bulkProductsSchema), (req, res) => {
  const { ids, action, value } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ data: null, error: 'No product IDs selected.' });
  }

  const tx = db.transaction(() => {
    let affected = 0;
    if (action === 'set_status') {
      const stmt = db.prepare('UPDATE products SET status = ? WHERE id = ?');
      for (const id of ids) stmt.run(value, id);
      affected = ids.length;
    } else if (action === 'set_category') {
      const stmt = db.prepare('UPDATE products SET category = ? WHERE id = ?');
      for (const id of ids) stmt.run(value, id);
      affected = ids.length;
    } else if (action === 'adjust_price_percent') {
      const pct = Number(value) || 0;
      const factor = 1 + (pct / 100);
      const stmt = db.prepare('UPDATE products SET price = ROUND(price * ?) WHERE id = ?');
      for (const id of ids) stmt.run(factor, id);
      affected = ids.length;
    } else if (action === 'adjust_price_amount') {
      const amt = Number(value) || 0;
      const stmt = db.prepare('UPDATE products SET price = MAX(1, price + ?) WHERE id = ?');
      for (const id of ids) stmt.run(amt, id);
      affected = ids.length;
    } else if (action === 'mark_flag') {
      const flagCol = {
        flashSale: 'is_flash_sale',
        trending: 'is_trending',
        bestseller: 'is_bestseller',
        new: 'is_new',
        recommended: 'is_recommended'
      }[value.flag];

      if (flagCol) {
        const stmt = db.prepare(`UPDATE products SET ${flagCol} = ? WHERE id = ?`);
        for (const id of ids) stmt.run(value.enabled ? 1 : 0, id);
        affected = ids.length;
      }
    } else if (action === 'delete') {
      const now = new Date().toISOString();
      const stmt = db.prepare("UPDATE products SET deleted_at = ?, status = 'archived' WHERE id = ?");
      for (const id of ids) stmt.run(now, id);
      affected = ids.length;
    }
    return affected;
  });

  const count = tx();
  logActivity('update', 'product', 'bulk', `Bulk action "${action}" applied to ${count} products`);
  return res.json({ data: { affectedCount: count }, error: null });
});

// GET /api/admin/products/export/csv
router.get('/products/export/csv', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY name ASC').all();

  const headers = ['ID', 'SKU', 'Name', 'Brand', 'Category', 'Price', 'MRP', 'CostPrice', 'Stock', 'Status', 'GSTRate', 'Supplier'];
  const rows = [headers.join(',')];

  for (const p of products) {
    const row = [
      `"${p.id}"`,
      `"${p.sku || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      p.price,
      p.mrp || p.original_price || p.price,
      p.cost_price || 0,
      p.stock,
      `"${p.status || 'active'}"`,
      p.gst_rate || 18,
      `"${(p.supplier || '').replace(/"/g, '""')}"`
    ];
    rows.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="techbazaar_products.csv"');
  return res.send(rows.join('\n'));
});

// ==========================================
// 4. INVENTORY MANAGEMENT
// ==========================================

// GET /api/admin/inventory
router.get('/inventory', (req, res) => {
  const { tab = 'all', search } = req.query;

  let query = 'SELECT id, sku, name, brand, category, stock, low_stock_threshold, track_inventory, allow_backorder, supplier, price, image FROM products WHERE deleted_at IS NULL';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ? OR brand LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (tab === 'low') {
    query += ' AND stock > 0 AND stock <= COALESCE(low_stock_threshold, 3)';
  } else if (tab === 'out') {
    query += ' AND stock = 0';
  }

  query += ' ORDER BY stock ASC';
  const items = db.prepare(query).all(...params);

  // Summary counts
  const totalSkuCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL').get().count;
  const lowCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock > 0 AND stock <= COALESCE(low_stock_threshold, 3) AND deleted_at IS NULL').get().count;
  const outCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock = 0 AND deleted_at IS NULL').get().count;

  return res.json({
    data: {
      items,
      counts: {
        all: totalSkuCount,
        low: lowCount,
        out: outCount
      }
    },
    error: null
  });
});

// POST /api/admin/inventory/adjust
router.post('/inventory/adjust', validateBody(adminSchemas.adjustInventorySchema), (req, res) => {
  const { productId, type, quantity, reason, notes, referenceId } = req.body;
  if (!productId || quantity === undefined || !reason) {
    return res.status(400).json({ data: null, error: 'Product ID, quantity, and reason are required.' });
  }

  const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(productId);
  if (!product) {
    return res.status(404).json({ data: null, error: 'Product not found.' });
  }

  const q = Number(quantity);
  let newStock = product.stock;
  let change = 0;

  if (type === 'add') {
    change = q;
    newStock = product.stock + q;
  } else if (type === 'subtract') {
    change = -q;
    newStock = Math.max(0, product.stock - q);
  } else if (type === 'set') {
    change = q - product.stock;
    newStock = Math.max(0, q);
  }

  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, productId);

  db.prepare(`
    INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(productId, change, product.stock, newStock, reason, referenceId || null, notes || null);

  logActivity('stock_change', 'product', productId, `Adjusted stock for "${product.name}" from ${product.stock} to ${newStock} (${reason})`, { stock: product.stock }, { stock: newStock }, true);

  return res.json({
    data: {
      productId,
      stockBefore: product.stock,
      stockAfter: newStock,
      change
    },
    error: null
  });
});

// GET /api/admin/inventory/movements
router.get('/inventory/movements', (req, res) => {
  const { productId, limit = 50 } = req.query;

  let query = `
    SELECT sm.*, p.name as product_name, p.sku, p.image
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (productId) {
    query += ' AND sm.product_id = ?';
    params.push(productId);
  }

  query += ' ORDER BY sm.created_at DESC LIMIT ?';
  params.push(Number(limit));

  const movements = db.prepare(query).all(...params);
  return res.json({ data: { movements }, error: null });
});

// ==========================================
// 5. ORDERS & FULFILLMENT
// ==========================================

// GET /api/admin/orders
router.get('/orders', validateQuery(adminSchemas.paginationQuerySchema), (req, res) => {
  const { status, paymentMethod, search, from, to, limit = 50 } = req.query;
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (paymentMethod && paymentMethod !== 'all') {
    query += ' AND payment_method = ?';
    params.push(paymentMethod);
  }

  if (search) {
    query += ' AND (order_number LIKE ? OR guest_name LIKE ? OR guest_email LIKE ? OR guest_phone LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (from) {
    query += ' AND DATE(created_at) >= DATE(?)';
    params.push(from);
  }
  if (to) {
    query += ' AND DATE(created_at) <= DATE(?)';
    params.push(to);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(safeLimit);

  const orders = db.prepare(query).all(...params);

  // Attach items count and preview
  const formatted = orders.map(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    return {
      ...o,
      itemsCount: items.reduce((acc, i) => acc + i.quantity, 0),
      itemsPreview: items.map(i => ({ name: i.product_name, quantity: i.quantity, image: i.image }))
    };
  });

  return res.json({ data: { orders: formatted }, error: null });
});

// GET /api/admin/orders/:id
router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ data: null, error: 'Order not found.' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const invoice = db.prepare('SELECT id, invoice_number FROM invoices WHERE order_id = ?').get(order.id);

  return res.json({
    data: {
      order: {
        ...order,
        items,
        statusHistory: order.status_history ? JSON.parse(order.status_history) : [],
        shippingAddress: order.address ? JSON.parse(order.address) : {},
        linkedInvoice: invoice || null
      }
    },
    error: null
  });
});

// PATCH /api/admin/orders/:id
router.patch('/orders/:id', validateBody(adminSchemas.updateOrderSchema), (req, res) => {
  const { status, note, courierName, trackingNumber, internalNotes, paymentStatus } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Order not found.' });
  }

  const updates = [];
  const params = [];

  if (courierName !== undefined) { updates.push('courier_name = ?'); params.push(courierName.trim()); }
  if (trackingNumber !== undefined) { updates.push('tracking_number = ?'); params.push(trackingNumber.trim()); }
  if (internalNotes !== undefined) { updates.push('internal_notes = ?'); params.push(internalNotes); }
  if (paymentStatus !== undefined) { updates.push('payment_status = ?'); params.push(paymentStatus); }

  if (status && status !== existing.status) {
    updates.push('status = ?');
    params.push(status);

    const history = existing.status_history ? JSON.parse(existing.status_history) : [];
    history.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Order updated to ${status} by admin.`
    });
    updates.push('status_history = ?');
    params.push(JSON.stringify(history));
  }

  const applyUpdate = db.transaction(() => {
    if (status === 'Cancelled' && existing.status !== 'Cancelled') {
      const linkedInv = db.prepare('SELECT invoice_number FROM invoices WHERE order_id = ?').get(existing.id);
      const alreadyRestored = db.prepare(`
        SELECT id FROM stock_movements
        WHERE reason IN ('return', 'void') AND reference_id IN (?, ?)
        LIMIT 1
      `).get(existing.order_number, linkedInv?.invoice_number || '');

      if (!alreadyRestored) {
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(existing.id);
        for (const item of items) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
          const curStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
          db.prepare(`
            INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
            VALUES (?, ?, ?, ?, 'return', ?, 'Order cancelled - stock restored')
          `).run(item.product_id, item.quantity, curStock.stock - item.quantity, curStock.stock, existing.order_number);
        }
      }
    }

    if (updates.length > 0) {
      db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);
    }
  });

  applyUpdate();
  logActivity('status_change', 'order', req.params.id, `Updated order ${existing.order_number} to ${status || existing.status}`);
  return res.json({ data: { message: 'Order updated successfully' }, error: null });
});

// POST /api/admin/orders/:id/create-invoice (1-Click Invoice Generation from Order)
router.post('/orders/:id/create-invoice', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ data: null, error: 'Order not found.' });

  const existingInv = db.prepare('SELECT id, invoice_number FROM invoices WHERE order_id = ?').get(order.id);
  if (existingInv) {
    return res.json({ data: { invoiceId: existingInv.id, invoiceNumber: existingInv.invoice_number, message: 'Invoice already exists for this order.' }, error: null });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const settings = getSettingsMap();
  const invoiceNumber = getNextSequence('invoice', settings.invoice_prefix || 'INV-2026-');

  const lineItems = items.map(i => ({
    rate: i.price,
    quantity: i.quantity,
    item_name: i.product_name,
    product_id: i.product_id,
    taxRate: 18,
    isTaxInclusive: true
  }));

  const totals = calculateDocumentTotals({
    items: lineItems,
    shippingAmount: order.shipping || 0,
    placeOfSupply: 'Karnataka (29)'
  });

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, order_id, customer_name, customer_email, customer_phone,
      place_of_supply, shipping_address, invoice_date, due_date, payment_terms,
      status, subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount,
      igst_amount, shipping_amount, round_off, total, amount_paid, balance_due,
      amount_in_words, notes, terms
    ) VALUES (
      ?, ?, ?, ?, ?,
      'Karnataka (29)', ?, DATE('now'), DATE('now'), 'Due on receipt',
      'Paid', ?, ?, ?, ?, ?,
      0, ?, ?, ?, ?, 0,
      ?, ?, ?
    )
  `);

  const invRes = insertInv.run(
    invoiceNumber,
    order.id,
    order.guest_name,
    order.guest_email,
    order.guest_phone,
    order.address,
    totals.subtotal,
    order.discount_amount || 0,
    totals.taxableValue,
    totals.cgstAmount,
    totals.sgstAmount,
    order.shipping || 0,
    totals.roundOff,
    order.total,
    order.total,
    totals.amountInWords,
    `Generated automatically from Order ${order.order_number}`,
    settings.invoice_terms || ''
  );

  const invoiceId = invRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (invoice_id, product_id, item_name, quantity, rate, line_total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const it of totals.items) {
    insertItem.run(invoiceId, it.product_id, it.item_name, it.quantity, it.rate, it.lineTotal);
  }

  // Record full payment since online order is paid
  db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
    VALUES (?, ?, ?, DATE('now'), ?, 'Order checkout payment')
  `).run(invoiceId, order.total, order.payment_method || 'card', order.order_number);

  logActivity('create', 'invoice', invoiceId, `Created Invoice ${invoiceNumber} from Order ${order.order_number}`);

  return res.json({
    data: {
      invoiceId,
      invoiceNumber,
      message: 'Invoice created successfully'
    },
    error: null
  });
});

// POST /api/admin/orders/manual (Manual telephone / walk-in sales)
router.post('/orders/manual', validateBody(adminSchemas.manualOrderSchema), (req, res) => {
  const { customer, shippingAddress, items, paymentMethod = 'cash', internalNotes } = req.body;
  if (!customer?.name || !items || items.length === 0) {
    return res.status(400).json({ data: null, error: 'Customer name and items are required.' });
  }

  const tx = db.transaction(() => {
    let subtotal = 0;
    const orderItems = [];

    for (const it of items) {
      const prod = db.prepare('SELECT id, name, price, stock, image FROM products WHERE id = ?').get(it.productId);
      if (!prod) throw new Error(`Product ${it.productId} not found.`);
      if (prod.stock < it.quantity) throw new Error(`Insufficient stock for "${prod.name}" (available: ${prod.stock}).`);

      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(it.quantity, prod.id);
      db.prepare(`
        INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, notes)
        VALUES (?, ?, ?, ?, 'sale', 'Walk-in / Telephone manual order')
      `).run(prod.id, -it.quantity, prod.stock, prod.stock - it.quantity);

      subtotal += prod.price * it.quantity;
      orderItems.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: it.quantity,
        image: prod.image
      });
    }

    const orderNumber = `TB-DIR-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const orderRes = db.prepare(`
      INSERT INTO orders (
        order_number, guest_name, guest_email, guest_phone, status,
        status_history, subtotal, shipping, total, address, payment_method,
        payment_status, internal_notes, created_at
      ) VALUES (
        ?, ?, ?, ?, 'Delivered',
        ?, ?, 0, ?, ?, ?,
        'Paid', ?, ?
      )
    `).run(
      orderNumber,
      customer.name,
      customer.email || 'walkin@techbazaar.local',
      customer.phone || '9999999999',
      JSON.stringify([{ status: 'Delivered', timestamp: now, note: 'Direct manual sale completed.' }]),
      subtotal,
      subtotal,
      JSON.stringify(shippingAddress || { line1: 'Store Walk-in', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' }),
      paymentMethod,
      internalNotes || 'Manual walk-in order created by Admin',
      now
    );

    const orderId = orderRes.lastInsertRowid;
    for (const oi of orderItems) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(orderId, oi.productId, oi.name, oi.price, oi.quantity, oi.image);
    }

    return { orderId, orderNumber, total: subtotal };
  });

  try {
    const result = tx();
    logActivity('create', 'order', result.orderId, `Created manual order ${result.orderNumber} (₹${result.total})`);
    return res.status(201).json({ data: result, error: null });
  } catch (err) {
    return res.status(400).json({ data: null, error: err.message });
  }
});

// ==========================================
// 6. DISCOUNTS ENGINE
// ==========================================

// GET /api/admin/discounts
router.get('/discounts', (req, res) => {
  const discounts = db.prepare('SELECT * FROM discounts ORDER BY priority ASC, created_at DESC').all();
  return res.json({ data: { discounts }, error: null });
});

// POST /api/admin/discounts
router.post('/discounts', validateBody(adminSchemas.discountSchema), (req, res) => {
  const d = req.body;
  if (!d.title || !d.type) {
    return res.status(400).json({ data: null, error: 'Title and type are required.' });
  }

  const insert = db.prepare(`
    INSERT INTO discounts (
      code, title, description, type, value, rule_percentage, rule_flat, rule_mode,
      scope, scope_values, min_cart_amount, min_quantity, first_order_only,
      stackable, priority, usage_limit, limit_per_customer, starts_at, ends_at, active
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const code = d.code ? d.code.trim().toUpperCase() : null;
  const resInsert = insert.run(
    code,
    d.title.trim(),
    d.description || '',
    d.type,
    Number(d.value) || 0,
    d.rulePercentage !== undefined ? Number(d.rulePercentage) : null,
    d.ruleFlat !== undefined ? Number(d.ruleFlat) : null,
    d.ruleMode || 'higher',
    d.scope || 'cart',
    d.scopeValues ? JSON.stringify(d.scopeValues) : null,
    Number(d.minCartAmount) || 0,
    Number(d.minQuantity) || 0,
    d.firstOrderOnly ? 1 : 0,
    d.stackable ? 1 : 0,
    Number(d.priority) || 1,
    d.usageLimit ? Number(d.usageLimit) : null,
    Number(d.limitPerCustomer) || 1,
    d.startsAt || null,
    d.endsAt || null,
    d.active !== false ? 1 : 0
  );

  logActivity('create', 'discount', resInsert.lastInsertRowid, `Created discount rule "${d.title}" (${code || 'Automatic'})`);
  return res.status(201).json({ data: { id: resInsert.lastInsertRowid }, error: null });
});

// PATCH /api/admin/discounts/:id
router.patch('/discounts/:id', validateBody(adminSchemas.discountUpdateSchema), (req, res) => {
  const d = req.body;
  const existing = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ data: null, error: 'Discount not found.' });

  const updates = [];
  const params = [];

  if (d.code !== undefined) { updates.push('code = ?'); params.push(d.code ? d.code.trim().toUpperCase() : null); }
  if (d.title !== undefined) { updates.push('title = ?'); params.push(d.title.trim()); }
  if (d.description !== undefined) { updates.push('description = ?'); params.push(d.description); }
  if (d.type !== undefined) { updates.push('type = ?'); params.push(d.type); }
  if (d.value !== undefined) { updates.push('value = ?'); params.push(Number(d.value)); }
  if (d.rulePercentage !== undefined) { updates.push('rule_percentage = ?'); params.push(Number(d.rulePercentage)); }
  if (d.ruleFlat !== undefined) { updates.push('rule_flat = ?'); params.push(Number(d.ruleFlat)); }
  if (d.ruleMode !== undefined) { updates.push('rule_mode = ?'); params.push(d.ruleMode); }
  if (d.scope !== undefined) { updates.push('scope = ?'); params.push(d.scope); }
  if (d.scopeValues !== undefined) { updates.push('scope_values = ?'); params.push(JSON.stringify(d.scopeValues)); }
  if (d.minCartAmount !== undefined) { updates.push('min_cart_amount = ?'); params.push(Number(d.minCartAmount)); }
  if (d.minQuantity !== undefined) { updates.push('min_quantity = ?'); params.push(Number(d.minQuantity)); }
  if (d.active !== undefined) { updates.push('active = ?'); params.push(d.active ? 1 : 0); }
  if (d.startsAt !== undefined) { updates.push('starts_at = ?'); params.push(d.startsAt); }
  if (d.endsAt !== undefined) { updates.push('ends_at = ?'); params.push(d.endsAt); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE discounts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  logActivity('update', 'discount', req.params.id, `Updated discount "${existing.title}"`);
  return res.json({ data: { message: 'Discount updated successfully' }, error: null });
});

// DELETE /api/admin/discounts/:id
router.delete('/discounts/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM discounts WHERE id = ?').run(req.params.id);
  logActivity('delete', 'discount', req.params.id, `Deleted discount "${d?.title || req.params.id}"`);
  return res.json({ data: { message: 'Discount deleted' }, error: null });
});

// POST /api/admin/discounts/simulate (Live Test Simulator Panel)
router.post('/discounts/simulate', validateBody(adminSchemas.simulateDiscountSchema), (req, res) => {
  const { discountId, code, cartItems } = req.body;
  let discount = null;

  if (discountId) {
    discount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(discountId);
  } else if (code) {
    discount = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?)').get(code.trim());
  }

  if (!discount) {
    return res.json({ data: { valid: false, reason: 'Discount rule not found.' }, error: null });
  }

  // Populate cart items with real prices/categories if only IDs were passed
  const items = (cartItems || []).map(ci => {
    const prod = db.prepare('SELECT id, name, category, brand, price FROM products WHERE id = ?').get(ci.productId || ci.id);
    return {
      id: ci.productId || ci.id,
      price: prod ? prod.price : (ci.price || 1000),
      quantity: Number(ci.quantity) || 1,
      category: prod ? prod.category : (ci.category || 'general'),
      brand: prod ? prod.brand : (ci.brand || 'TechBazaar')
    };
  });

  const evalResult = evaluateDiscount(discount, { items });
  return res.json({ data: evalResult, error: null });
});

// ==========================================
// 7. ESTIMATES (QUOTATIONS)
// ==========================================

// GET /api/admin/estimates
router.get('/estimates', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM estimates WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (estimate_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const estimates = db.prepare(query).all(...params);
  return res.json({ data: { estimates }, error: null });
});

// GET /api/admin/estimates/:id
router.get('/estimates/:id', (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).json({ data: null, error: 'Estimate not found.' });

  const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(est.id);
  return res.json({
    data: {
      estimate: {
        ...est,
        billingAddress: est.billing_address ? JSON.parse(est.billing_address) : {},
        items
      }
    },
    error: null
  });
});

// POST /api/admin/estimates
router.post('/estimates', validateBody(adminSchemas.documentCreateSchema), (req, res) => {
  const { customer, items, estimateDate, validUntil, notes, terms, discountAmount, shippingAmount } = req.body;
  if (!customer?.name || !items || items.length === 0) {
    return res.status(400).json({ data: null, error: 'Customer name and line items are required.' });
  }

  const settings = getSettingsMap();
  const estimateNumber = getNextSequence('estimate', settings.estimate_prefix || 'EST-');

  const totals = calculateDocumentTotals({
    items,
    discountAmount: Number(discountAmount) || 0,
    shippingAmount: Number(shippingAmount) || 0,
    placeOfSupply: 'Karnataka (29)'
  });

  const insertEst = db.prepare(`
    INSERT INTO estimates (
      estimate_number, customer_id, customer_name, customer_email, customer_phone,
      billing_address, estimate_date, valid_until, status, subtotal, discount_amount,
      tax_amount, shipping_amount, round_off, total, amount_in_words, notes, terms
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'Draft', ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const estRes = insertEst.run(
    estimateNumber,
    customer.id || null,
    customer.name.trim(),
    customer.email ? customer.email.trim() : null,
    customer.phone ? customer.phone.trim() : null,
    JSON.stringify(customer.billingAddress || {}),
    estimateDate || new Date().toISOString().split('T')[0],
    validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    totals.subtotal,
    totals.discountAmount,
    totals.totalTax,
    totals.shippingAmount,
    totals.roundOff,
    totals.total,
    totals.amountInWords,
    notes || settings.invoice_notes || '',
    terms || settings.invoice_terms || ''
  );

  const estimateId = estRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO estimate_items (
      estimate_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of totals.items) {
    insertItem.run(
      estimateId,
      it.product_id || null,
      it.item_name || 'Line Item',
      it.description || '',
      it.quantity,
      it.rate,
      it.discountPercent || 0,
      it.discountAmount || 0,
      it.taxRate || 18,
      it.taxAmount || 0,
      it.lineTotal
    );
  }

  logActivity('create', 'estimate', estimateId, `Created Estimate ${estimateNumber} for ${customer.name}`);
  return res.status(201).json({ data: { id: estimateId, estimateNumber }, error: null });
});

// POST /api/admin/estimates/:id/convert-to-invoice (1-Click Quotation -> Invoice Conversion)
router.post('/estimates/:id/convert-to-invoice', (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).json({ data: null, error: 'Estimate not found.' });

  if (est.converted_invoice_id) {
    return res.json({ data: { invoiceId: est.converted_invoice_id, message: 'Estimate was already converted.' }, error: null });
  }

  const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(est.id);
  const settings = getSettingsMap();
  const invoiceNumber = getNextSequence('invoice', settings.invoice_prefix || 'INV-2026-');

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, estimate_id, customer_id, customer_name, customer_email, customer_phone,
      place_of_supply, billing_address, invoice_date, due_date, payment_terms,
      status, subtotal, discount_amount, taxable_value, cgst_amount, sgst_amount,
      igst_amount, shipping_amount, round_off, total, amount_paid, balance_due,
      amount_in_words, notes, terms
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      'Karnataka (29)', ?, DATE('now'), DATE('now', '+7 days'), 'Net 7',
      'Unpaid', ?, ?, ?, ?, ?,
      0, ?, ?, ?, 0, ?,
      ?, ?, ?
    )
  `);

  const invRes = insertInv.run(
    invoiceNumber,
    est.id,
    est.customer_id,
    est.customer_name,
    est.customer_email,
    est.customer_phone,
    est.billing_address,
    est.subtotal,
    est.discount_amount,
    est.subtotal - est.discount_amount,
    Math.round(est.tax_amount / 2),
    est.tax_amount - Math.round(est.tax_amount / 2),
    est.shipping_amount,
    est.round_off,
    est.total,
    est.total,
    est.amount_in_words,
    `Converted from Quotation ${est.estimate_number}`,
    est.terms
  );

  const invoiceId = invRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (
      invoice_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insertItem.run(
      invoiceId,
      it.product_id,
      it.item_name,
      it.description,
      it.quantity,
      it.rate,
      it.discount_percent,
      it.discount_amount,
      it.tax_rate,
      it.tax_amount,
      it.line_total
    );

    // Auto-decrement inventory if product_id exists and is found in products
    if (it.product_id) {
      const cur = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
      if (cur) {
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.quantity, it.product_id);
        const curAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'invoice', ?, 'Estimate converted to invoice')
        `).run(it.product_id, -it.quantity, cur.stock, curAfter.stock, invoiceNumber);
      }
    }
  }

  // Mark estimate as Accepted & link converted invoice
  db.prepare("UPDATE estimates SET status = 'Accepted', converted_invoice_id = ? WHERE id = ?").run(invoiceId, est.id);

  logActivity('create', 'invoice', invoiceId, `Converted Estimate ${est.estimate_number} to Invoice ${invoiceNumber}`);
  return res.json({ data: { invoiceId, invoiceNumber }, error: null });
});

// GET /api/admin/estimates/:id/pdf
router.get('/estimates/:id/pdf', async (req, res) => {
  const est = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  if (!est) return res.status(404).send('Estimate not found');

  const items = db.prepare('SELECT * FROM estimate_items WHERE estimate_id = ?').all(est.id);
  const settings = getSettingsMap();

  try {
    const pdfBuffer = await generateDocumentPDF({ ...est, items }, settings, 'estimate');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${est.estimate_number}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    return res.status(500).send('Error generating PDF');
  }
});

// ==========================================
// 8. INVOICES (BILLING)
// ==========================================

// GET /api/admin/invoices
router.get('/invoices', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const invoices = db.prepare(query).all(...params);
  return res.json({ data: { invoices }, error: null });
});

// GET /api/admin/invoices/:id
router.get('/invoices/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ data: null, error: 'Invoice not found.' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(inv.id);

  return res.json({
    data: {
      invoice: {
        ...inv,
        billingAddress: inv.billing_address ? JSON.parse(inv.billing_address) : {},
        shippingAddress: inv.shipping_address ? JSON.parse(inv.shipping_address) : {},
        items,
        payments
      }
    },
    error: null
  });
});

// POST /api/admin/invoices
router.post('/invoices', validateBody(adminSchemas.documentCreateSchema), (req, res) => {
  const { customer, items, invoiceDate, dueDate, paymentTerms, placeOfSupply, notes, terms, discountAmount, shippingAmount, template } = req.body;
  if (!customer?.name || !items || items.length === 0) {
    return res.status(400).json({ data: null, error: 'Customer name and line items are required.' });
  }

  const settings = getSettingsMap();
  const invoiceNumber = getNextSequence('invoice', settings.invoice_prefix || 'INV-2026-');

  const totals = calculateDocumentTotals({
    items,
    discountAmount: Number(discountAmount) || 0,
    shippingAmount: Number(shippingAmount) || 0,
    placeOfSupply: placeOfSupply || 'Karnataka (29)',
    companyState: settings.business_state ? `${settings.business_state} (${settings.business_state_code || '29'})` : 'Karnataka (29)'
  });

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, customer_id, customer_name, customer_email, customer_phone,
      customer_gstin, place_of_supply, billing_address, shipping_address,
      invoice_date, due_date, payment_terms, status, subtotal, discount_amount,
      taxable_value, cgst_amount, sgst_amount, igst_amount, shipping_amount,
      round_off, total, amount_paid, balance_due, amount_in_words, notes, terms, template
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, 'Unpaid', ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, 0, ?, ?, ?, ?, ?
    )
  `);

  const invRes = insertInv.run(
    invoiceNumber,
    customer.id || null,
    customer.name.trim(),
    customer.email ? customer.email.trim() : null,
    customer.phone ? customer.phone.trim() : null,
    customer.gstin ? customer.gstin.trim() : null,
    placeOfSupply || 'Karnataka (29)',
    JSON.stringify(customer.billingAddress || {}),
    JSON.stringify(customer.shippingAddress || {}),
    invoiceDate || new Date().toISOString().split('T')[0],
    dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentTerms || 'Due on receipt',
    totals.subtotal,
    totals.discountAmount,
    totals.taxableValue,
    totals.cgstAmount,
    totals.sgstAmount,
    totals.igstAmount,
    totals.shippingAmount,
    totals.roundOff,
    totals.total,
    totals.total,
    totals.amountInWords,
    notes || settings.invoice_notes || '',
    terms || settings.invoice_terms || '',
    template || 'standard'
  );

  const invoiceId = invRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (
      invoice_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of totals.items) {
    insertItem.run(
      invoiceId,
      it.product_id || null,
      it.item_name || 'Line Item',
      it.description || '',
      it.quantity,
      it.rate,
      it.discountPercent || 0,
      it.discountAmount || 0,
      it.taxRate || 18,
      it.taxAmount || 0,
      it.lineTotal
    );

    // Auto-decrement inventory if product_id exists and is found in products
    if (it.product_id) {
      const cur = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
      if (cur) {
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(it.quantity, it.product_id);
        const curAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
        db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
          VALUES (?, ?, ?, ?, 'invoice', ?, 'Invoice line item deduction')
        `).run(it.product_id, -it.quantity, cur.stock, curAfter.stock, invoiceNumber);
      }
    }
  }

  logActivity('create', 'invoice', invoiceId, `Created Invoice ${invoiceNumber} (₹${totals.total}) for ${customer.name}`);
  return res.status(201).json({ data: { id: invoiceId, invoiceNumber }, error: null });
});

// POST /api/admin/invoices/:id/payments (Record Partial or Full Payment)
router.post('/invoices/:id/payments', validateBody(adminSchemas.recordPaymentSchema), (req, res) => {
  const { amount, paymentMethod, paymentDate, referenceNumber, notes } = req.body;
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ data: null, error: 'Invoice not found.' });

  const payAmt = Number(amount);
  if (!payAmt || payAmt <= 0) {
    return res.status(400).json({ data: null, error: 'Payment amount must be greater than 0.' });
  }

  const insertPay = db.prepare(`
    INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertPay.run(
    inv.id,
    payAmt,
    paymentMethod || 'bank_transfer',
    paymentDate || new Date().toISOString().split('T')[0],
    referenceNumber || null,
    notes || null
  );

  const newPaid = inv.amount_paid + payAmt;
  const newBalance = Math.max(0, inv.total - newPaid);
  const newStatus = newBalance === 0 ? 'Paid' : 'Partially paid';

  db.prepare(`
    UPDATE invoices
    SET amount_paid = ?, balance_due = ?, status = ?
    WHERE id = ?
  `).run(newPaid, newBalance, newStatus, inv.id);

  logActivity('update', 'invoice', inv.id, `Recorded payment of ${formatMoney(payAmt)} for Invoice ${inv.invoice_number} (Balance: ${formatMoney(newBalance)})`);
  return res.json({ data: { amountPaid: newPaid, balanceDue: newBalance, status: newStatus }, error: null });
});

// POST /api/admin/invoices/:id/void (Void Invoice with Stock Restoration)
router.post('/invoices/:id/void', validateBody(adminSchemas.voidInvoiceSchema), (req, res) => {
  const { voidReason } = req.body;
  if (!voidReason) {
    return res.status(400).json({ data: null, error: 'Void reason is required.' });
  }

  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ data: null, error: 'Invoice not found.' });

  if (inv.status === 'Void') {
    return res.status(400).json({ data: null, error: 'Invoice is already void.' });
  }

  const voidTx = db.transaction(() => {
    const linkedOrder = inv.order_id
      ? db.prepare('SELECT id, order_number, status FROM orders WHERE id = ?').get(inv.order_id)
      : null;

    const alreadyRestored = (linkedOrder && linkedOrder.status === 'Cancelled') || Boolean(
      db.prepare(`
        SELECT id FROM stock_movements
        WHERE reason IN ('return', 'void') AND reference_id IN (?, ?)
        LIMIT 1
      `).get(inv.invoice_number, linkedOrder?.order_number || '')
    );

    if (!alreadyRestored) {
      const items = db.prepare('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?').all(inv.id);
      for (const it of items) {
        if (it.product_id) {
          const cur = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
          if (cur) {
            db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.quantity, it.product_id);
            const curAfter = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id);
            db.prepare(`
              INSERT INTO stock_movements (product_id, quantity_change, stock_before, stock_after, reason, reference_id, notes)
              VALUES (?, ?, ?, ?, 'void', ?, 'Invoice voided - stock restored')
            `).run(it.product_id, it.quantity, cur.stock, curAfter.stock, inv.invoice_number);
          }
        }
      }
    }

    db.prepare("UPDATE invoices SET status = 'Void', void_reason = ? WHERE id = ?").run(voidReason, inv.id);
  });

  voidTx();
  logActivity('void', 'invoice', inv.id, `Voided Invoice ${inv.invoice_number} (${voidReason})`);

  return res.json({ data: { message: 'Invoice voided and inventory restored.' }, error: null });
});

// GET /api/admin/invoices/:id/pdf
router.get('/invoices/:id/pdf', async (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).send('Invoice not found');

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  const settings = getSettingsMap();

  try {
    const pdfBuffer = await generateDocumentPDF({ ...inv, items }, settings, 'invoice');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.invoice_number}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    return res.status(500).send('Error generating PDF');
  }
});

// ==========================================
// 9. CUSTOMERS CRM
// ==========================================

// GET /api/admin/customers
router.get('/customers', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const customers = db.prepare(query).all(...params);

  // Compute LTV and order count
  const enriched = customers.map(c => {
    const stats = db.prepare(`
      SELECT COUNT(*) as orders_count, COALESCE(SUM(total), 0) as total_spent, MAX(created_at) as last_order_date
      FROM orders
      WHERE LOWER(guest_email) = LOWER(?) OR user_id = ?
    `).get(c.email, c.user_id || 0);

    return {
      ...c,
      tags: c.tags ? JSON.parse(c.tags) : [],
      ordersCount: stats.orders_count || 0,
      totalSpent: stats.total_spent || 0,
      lastOrderDate: stats.last_order_date || null
    };
  });

  return res.json({ data: { customers: enriched }, error: null });
});

// GET /api/admin/customers/:id
router.get('/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ data: null, error: 'Customer not found.' });

  const orders = db.prepare(`
    SELECT id, order_number, total, status, created_at
    FROM orders
    WHERE LOWER(guest_email) = LOWER(?) OR user_id = ?
    ORDER BY created_at DESC
  `).all(customer.email, customer.user_id || 0);

  const invoices = db.prepare(`
    SELECT id, invoice_number, total, balance_due, status, invoice_date
    FROM invoices
    WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)
    ORDER BY created_at DESC
  `).all(customer.id, customer.email);

  const discountSavings = db.prepare(`
    SELECT COALESCE(SUM(amount_saved), 0) as total_savings
    FROM discount_usage
    WHERE LOWER(customer_email) = LOWER(?)
  `).get(customer.email);

  return res.json({
    data: {
      customer: {
        ...customer,
        tags: customer.tags ? JSON.parse(customer.tags) : [],
        billingAddress: customer.billing_address ? JSON.parse(customer.billing_address) : {},
        shippingAddress: customer.shipping_address ? JSON.parse(customer.shipping_address) : {},
        orders,
        invoices,
        totalSavings: discountSavings.total_savings
      }
    },
    error: null
  });
});

// POST /api/admin/customers
router.post('/customers', validateBody(adminSchemas.customerCreateSchema), (req, res) => {
  const c = req.body;
  if (!c.name || !c.email) {
    return res.status(400).json({ data: null, error: 'Name and email are required.' });
  }

  const existing = db.prepare('SELECT id FROM customers WHERE LOWER(email) = LOWER(?)').get(c.email.trim());
  if (existing) {
    return res.status(409).json({ data: null, error: 'A customer with this email already exists.' });
  }

  const insert = db.prepare(`
    INSERT INTO customers (name, email, phone, gstin, billing_address, shipping_address, tags, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resInsert = insert.run(
    c.name.trim(),
    c.email.trim().toLowerCase(),
    c.phone ? c.phone.trim() : null,
    c.gstin ? c.gstin.trim() : null,
    JSON.stringify(c.billingAddress || {}),
    JSON.stringify(c.shippingAddress || {}),
    JSON.stringify(c.tags || []),
    c.notes || ''
  );

  logActivity('create', 'customer', resInsert.lastInsertRowid, `Created customer profile "${c.name}"`);
  return res.status(201).json({ data: { id: resInsert.lastInsertRowid }, error: null });
});

// POST /api/admin/customers/merge (Merge Duplicate Customers)
router.post('/customers/merge', validateBody(adminSchemas.customerMergeSchema), (req, res) => {
  const { primaryId, secondaryId } = req.body;
  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    return res.status(400).json({ data: null, error: 'Select two distinct customer accounts to merge.' });
  }

  const primary = db.prepare('SELECT * FROM customers WHERE id = ?').get(primaryId);
  const secondary = db.prepare('SELECT * FROM customers WHERE id = ?').get(secondaryId);

  if (!primary || !secondary) {
    return res.status(404).json({ data: null, error: 'One or both customer accounts not found.' });
  }

  // Reassign orders and invoices
  db.transaction(() => {
    db.prepare('UPDATE orders SET guest_email = ? WHERE LOWER(guest_email) = LOWER(?)').run(primary.email, secondary.email);
    db.prepare('UPDATE invoices SET customer_id = ?, customer_email = ? WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)').run(primary.id, primary.email, secondary.id, secondary.email);
    db.prepare('UPDATE estimates SET customer_id = ?, customer_email = ? WHERE customer_id = ? OR LOWER(customer_email) = LOWER(?)').run(primary.id, primary.email, secondary.id, secondary.email);
    db.prepare('DELETE FROM customers WHERE id = ?').run(secondary.id);
  })();

  logActivity('update', 'customer', primary.id, `Merged customer ${secondary.name} (${secondary.email}) into ${primary.name}`);
  return res.json({ data: { message: 'Customers merged successfully' }, error: null });
});

// ==========================================
// 10. REPORTS & EXPORTS
// ==========================================

// GET /api/admin/reports/sales
router.get('/reports/sales', (req, res) => {
  const { from, to } = req.query;
  let dateFilter = '';
  const params = [];

  if (from) {
    dateFilter += ' AND DATE(created_at) >= DATE(?)';
    params.push(from);
  }
  if (to) {
    dateFilter += ' AND DATE(created_at) <= DATE(?)';
    params.push(to);
  }

  const stats = db.prepare(`
    SELECT 
      COALESCE(SUM(subtotal), 0) as gross_sales,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(shipping), 0) as total_shipping,
      COALESCE(SUM(total), 0) as net_sales,
      COUNT(*) as orders_count
    FROM orders
    WHERE status != 'Cancelled' ${dateFilter}
  `).get(...params);

  const timeline = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue
    FROM orders
    WHERE status != 'Cancelled' ${dateFilter}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(...params);

  return res.json({ data: { stats, timeline }, error: null });
});

// GET /api/admin/reports/products
router.get('/reports/products', (req, res) => {
  const items = db.prepare(`
    SELECT 
      p.id, p.sku, p.name, p.category, p.cost_price, p.price, p.stock,
      COALESCE(SUM(oi.quantity), 0) as units_sold,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY revenue DESC
  `).all();

  const formatted = items.map(i => {
    const margin = i.price > 0 ? Math.round(((i.price - (i.cost_price || 0)) / i.price) * 100) : 0;
    const profit = (i.price - (i.cost_price || 0)) * i.units_sold;
    return { ...i, margin, profit };
  });

  return res.json({ data: { products: formatted }, error: null });
});

// GET /api/admin/reports/categories
router.get('/reports/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT 
      p.category,
      COUNT(DISTINCT p.id) as product_count,
      COALESCE(SUM(oi.quantity), 0) as units_sold,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    WHERE p.deleted_at IS NULL
    GROUP BY p.category
    ORDER BY revenue DESC
  `).all();

  return res.json({ data: { categories }, error: null });
});

// GET /api/admin/reports/discounts
router.get('/reports/discounts', (req, res) => {
  const discounts = db.prepare(`
    SELECT 
      d.id, d.code, d.title, d.type, d.used_count,
      COALESCE(SUM(du.amount_saved), 0) as total_discount_given
    FROM discounts d
    LEFT JOIN discount_usage du ON d.id = du.discount_id
    GROUP BY d.id
    ORDER BY total_discount_given DESC
  `).all();

  return res.json({ data: { discounts }, error: null });
});

// GET /api/admin/reports/tax (GST Summary for GSTR-1)
router.get('/reports/tax', (req, res) => {
  // Aggregate from Invoices
  const invoices = db.prepare("SELECT taxable_value, cgst_amount, sgst_amount, igst_amount, total FROM invoices WHERE status != 'Void'").all();

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let grandTotal = 0;

  for (const inv of invoices) {
    totalTaxable += inv.taxable_value || 0;
    totalCGST += inv.cgst_amount || 0;
    totalSGST += inv.sgst_amount || 0;
    totalIGST += inv.igst_amount || 0;
    grandTotal += inv.total || 0;
  }

  // Rate slab table (0%, 5%, 12%, 18%, 28%)
  const slabs = [
    { slab: '0%', taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    { slab: '5%', taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    { slab: '12%', taxable: 0, cgst: 0, sgst: 0, igst: 0 },
    { slab: '18%', taxable: totalTaxable, cgst: totalCGST, sgst: totalSGST, igst: totalIGST },
    { slab: '28%', taxable: 0, cgst: 0, sgst: 0, igst: 0 }
  ];

  return res.json({
    data: {
      summary: {
        totalTaxable,
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax: totalCGST + totalSGST + totalIGST,
        grandTotal
      },
      slabs
    },
    error: null
  });
});

// GET /api/admin/reports/stock-valuation
router.get('/reports/stock-valuation', (req, res) => {
  const products = db.prepare('SELECT price, cost_price, stock FROM products WHERE deleted_at IS NULL').all();

  let totalStockUnits = 0;
  let valuationCost = 0;
  let valuationSelling = 0;

  for (const p of products) {
    totalStockUnits += p.stock;
    valuationCost += (p.cost_price || Math.round(p.price * 0.65)) * p.stock;
    valuationSelling += p.price * p.stock;
  }

  const potentialProfit = valuationSelling - valuationCost;
  const overallMargin = valuationSelling > 0 ? Math.round((potentialProfit / valuationSelling) * 100) : 0;

  return res.json({
    data: {
      totalStockUnits,
      valuationCost,
      valuationSelling,
      potentialProfit,
      overallMargin
    },
    error: null
  });
});

// ==========================================
// 11. SETTINGS & DATA MANAGEMENT
// ==========================================

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  return res.json({ data: { settings: getSettingsMap() }, error: null });
});

// POST /api/admin/settings
router.post('/settings', (req, res) => {
  const newSettings = req.body;
  const insert = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    for (const [k, v] of Object.entries(newSettings)) {
      insert.run(k, String(v));
    }
  })();

  logActivity('update', 'setting', 'all', 'Updated system and invoice configuration settings');
  return res.json({ data: { message: 'Settings saved successfully' }, error: null });
});

// GET /api/admin/settings/backup (Download full SQLite database)
router.get('/settings/backup', (req, res) => {
  const dbPath = path.resolve('server/db/techbazaar.db');
  if (!fs.existsSync(dbPath)) {
    return res.status(404).send('Database file not found');
  }

  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="techbazaar_backup_${new Date().toISOString().split('T')[0]}.db"`);
  const fileStream = fs.createReadStream(dbPath);
  return fileStream.pipe(res);
});

// POST /api/admin/settings/purge-logs (>90 days old)
router.post('/settings/purge-logs', (req, res) => {
  const del = db.prepare("DELETE FROM activity_log WHERE created_at < DATE('now', '-90 days')").run();
  return res.json({ data: { deletedCount: del.changes }, error: null });
});

// ==========================================
// 12. ACTIVITY LOG & 1-CLICK UNDO
// ==========================================

// GET /api/admin/activity-log
router.get('/activity-log', validateQuery(adminSchemas.paginationQuerySchema), (req, res) => {
  const { entity, action, limit = 100 } = req.query;
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
  let query = 'SELECT * FROM activity_log WHERE 1=1';
  const params = [];

  if (entity && entity !== 'all') {
    query += ' AND entity_type = ?';
    params.push(entity);
  }
  if (action && action !== 'all') {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(safeLimit);

  const logs = db.prepare(query).all(...params);
  return res.json({ data: { logs }, error: null });
});

// POST /api/admin/activity-log/:id/undo (1-Click Safe Undo)
router.post('/activity-log/:id/undo', (req, res) => {
  const log = db.prepare('SELECT * FROM activity_log WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ data: null, error: 'Log entry not found.' });
  if (!log.undoable || log.undone) {
    return res.status(400).json({ data: null, error: 'This action is not undoable or has already been undone.' });
  }

  const before = log.before_state ? JSON.parse(log.before_state) : null;
  if (!before) {
    return res.status(400).json({ data: null, error: 'No previous snapshot available for undo.' });
  }

  if (log.action === 'merge_products') {
    try {
      const undoRes = undoMerge(log.id);
      return res.json({ data: undoRes, error: null });
    } catch (err) {
      return res.status(400).json({ data: null, error: err.message });
    }
  }

  if (log.entity_type === 'product') {
    if (log.action === 'price_change' || log.action === 'update') {
      if (before.price !== undefined) {
        db.prepare('UPDATE products SET price = ? WHERE id = ?').run(before.price, log.entity_id);
      }
      if (before.stock !== undefined) {
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(before.stock, log.entity_id);
      }
    } else if (log.action === 'delete') {
      // Restore product
      db.prepare('UPDATE products SET deleted_at = NULL, status = ? WHERE id = ?').run(before.status || 'active', log.entity_id);
    } else if (log.action === 'stock_change') {
      if (before.stock !== undefined) {
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(before.stock, log.entity_id);
      }
    }
  }

  db.prepare('UPDATE activity_log SET undone = 1 WHERE id = ?').run(log.id);
  logActivity('undo', log.entity_type, log.entity_id, `Undid previous action: ${log.details}`);

  return res.json({ data: { message: 'Action successfully undone.' }, error: null });
});

// --- BANNERS & ADS MANAGEMENT ---

// GET /api/admin/banners - list all banners with analytics
router.get('/banners', (req, res) => {
  const rawBanners = db.prepare(`
    SELECT b.*,
      COALESCE(SUM(s.impressions), 0) AS total_impressions,
      COALESCE(SUM(s.clicks), 0) AS total_clicks,
      CASE WHEN SUM(s.impressions) > 0 
        THEN ROUND((CAST(SUM(s.clicks) AS REAL) / SUM(s.impressions)) * 100, 2)
        ELSE 0 END AS ctr
    FROM banners b
    LEFT JOIN banner_stats s ON b.id = s.banner_id
    GROUP BY b.id
    ORDER BY b.slot ASC, b.sort_order ASC, b.id ASC
  `).all();

  const banners = rawBanners.map(b => ({
    ...b,
    image_desktop: b.desktop_image,
    image_mobile: b.mobile_image,
    label_pill: b.label,
    is_active: b.active,
    priority: b.sort_order,
    impressions: b.total_impressions,
    clicks: b.total_clicks
  }));

  return res.json({ data: { banners }, error: null });
});

// POST /api/admin/banners - create banner
router.post('/banners', validateBody(adminSchemas.bannerCreateSchema), (req, res) => {
  const b = req.body;
  const desktop_image = b.desktop_image || b.image_desktop;
  if (!b.title || !b.slot || !desktop_image) {
    return res.status(400).json({ data: null, error: 'Title, slot, and desktop image are required.' });
  }

  const mobile_image = b.mobile_image || b.image_mobile || desktop_image;
  const label = b.label !== undefined ? b.label : (b.label_pill !== undefined ? b.label_pill : null);
  const active = b.active !== undefined ? (b.active ? 1 : 0) : (b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1);
  const sort_order = b.sort_order !== undefined ? Number(b.sort_order) : (b.priority !== undefined ? Number(b.priority) : 0);
  const audience = b.audience || 'both';

  const result = db.prepare(`
    INSERT INTO banners (
      title, slot, desktop_image, mobile_image, thumb, focal_x, focal_y,
      alt, link_type, link_target, new_tab, label, starts_at, ends_at,
      active, sort_order, audience
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    b.title.trim(),
    b.slot,
    desktop_image,
    mobile_image,
    b.thumb || mobile_image || desktop_image,
    b.focal_x !== undefined ? Number(b.focal_x) : 50,
    b.focal_y !== undefined ? Number(b.focal_y) : 50,
    b.alt ? b.alt.trim() : b.title.trim(),
    b.link_type || 'none',
    b.link_target || '',
    b.new_tab ? 1 : 0,
    label,
    b.starts_at || null,
    b.ends_at || null,
    active,
    sort_order,
    audience
  );

  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(result.lastInsertRowid);
  logActivity('create', 'banner', banner.id, `Created banner "${banner.title}" for slot "${banner.slot}"`);

  return res.status(201).json({ data: { banner: {
    ...banner,
    image_desktop: banner.desktop_image,
    image_mobile: banner.mobile_image,
    label_pill: banner.label,
    is_active: banner.active,
    priority: banner.sort_order
  } }, error: null });
});

// PUT /api/admin/banners/:id - update banner
router.put('/banners/:id', validateBody(adminSchemas.bannerUpdateSchema), (req, res) => {
  const b = req.body;
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Banner not found.' });
  }

  const desktop_image = b.desktop_image || b.image_desktop || existing.desktop_image;
  const mobile_image = b.mobile_image || b.image_mobile || existing.mobile_image;
  const label = b.label !== undefined ? b.label : (b.label_pill !== undefined ? b.label_pill : existing.label);
  const active = b.active !== undefined ? (b.active ? 1 : 0) : (b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.active);
  const sort_order = b.sort_order !== undefined ? Number(b.sort_order) : (b.priority !== undefined ? Number(b.priority) : existing.sort_order);
  const audience = b.audience !== undefined ? b.audience : (existing.audience || 'both');

  db.prepare(`
    UPDATE banners SET
      title = ?, slot = ?, desktop_image = ?, mobile_image = ?, thumb = ?,
      focal_x = ?, focal_y = ?, alt = ?, link_type = ?, link_target = ?,
      new_tab = ?, label = ?, starts_at = ?, ends_at = ?, active = ?, sort_order = ?,
      audience = ?
    WHERE id = ?
  `).run(
    b.title ? b.title.trim() : existing.title,
    b.slot || existing.slot,
    desktop_image,
    mobile_image,
    b.thumb || existing.thumb || mobile_image,
    b.focal_x !== undefined ? Number(b.focal_x) : existing.focal_x,
    b.focal_y !== undefined ? Number(b.focal_y) : existing.focal_y,
    b.alt ? b.alt.trim() : existing.alt,
    b.link_type !== undefined ? b.link_type : existing.link_type,
    b.link_target !== undefined ? b.link_target : existing.link_target,
    b.new_tab !== undefined ? (b.new_tab ? 1 : 0) : existing.new_tab,
    label,
    b.starts_at !== undefined ? b.starts_at : existing.starts_at,
    b.ends_at !== undefined ? b.ends_at : existing.ends_at,
    active,
    sort_order,
    audience,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  logActivity('update', 'banner', updated.id, `Updated banner "${updated.title}"`);

  return res.json({ data: { banner: {
    ...updated,
    image_desktop: updated.desktop_image,
    image_mobile: updated.mobile_image,
    label_pill: updated.label,
    is_active: updated.active,
    priority: updated.sort_order
  } }, error: null });
});

// DELETE /api/admin/banners/:id
router.delete('/banners/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Banner not found.' });
  }

  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  logActivity('delete', 'banner', req.params.id, `Deleted banner "${existing.title}"`, existing, null, true);

  return res.json({ data: { message: 'Banner deleted successfully' }, error: null });
});

// PATCH /api/admin/banners/:id/toggle
router.patch('/banners/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ data: null, error: 'Banner not found.' });
  }

  const nextState = existing.active ? 0 : 1;
  db.prepare('UPDATE banners SET active = ? WHERE id = ?').run(nextState, req.params.id);

  return res.json({ data: { id: existing.id, active: nextState }, error: null });
});

// POST /api/admin/banners/reorder
router.post('/banners/reorder', validateBody(adminSchemas.bannerReorderSchema), (req, res) => {
  const { bannerIds } = req.body;
  if (!Array.isArray(bannerIds)) {
    return res.status(400).json({ data: null, error: 'bannerIds array required' });
  }

  const stmt = db.prepare('UPDATE banners SET sort_order = ? WHERE id = ?');
  const updateMany = db.transaction((ids) => {
    ids.forEach((id, idx) => stmt.run(idx, id));
  });
  updateMany(bannerIds);

  return res.json({ data: { message: 'Banners reordered successfully' }, error: null });
});

// POST /api/admin/banners/upload - PNG/JPEG/WebP only (rejects SVG, validates magic bytes & dimensions)
router.post('/banners/upload', validateBody(adminSchemas.bannerUploadSchema), (req, res) => {
  try {
    const base64 = req.body.base64 || req.body.imageBase64 || req.body.image;
    const rawType = req.body.type || req.body.deviceType || 'banner';
    const safeType = String(rawType).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'banner';

    const check = validateImageUpload(base64, { maxBytes: 5 * 1024 * 1024, minDim: 16, maxDim: 4096 });
    if (!check.valid) {
      return res.status(400).json({ data: null, error: check.error });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'banners');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanFilename = `${safeType}_${crypto.randomBytes(12).toString('hex')}.${check.ext}`;
    const filePath = path.join(uploadDir, cleanFilename);
    fs.writeFileSync(filePath, check.buffer);

    const publicUrl = `/uploads/banners/${cleanFilename}`;
    return res.json({
      data: { url: publicUrl, filename: cleanFilename, width: check.width, height: check.height },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/admin/banners/export/csv
router.get('/banners/export/csv', (req, res) => {
  const stats = db.prepare(`
    SELECT b.id, b.title, b.slot, b.active,
           COALESCE(SUM(s.impressions), 0) AS total_impressions,
           COALESCE(SUM(s.clicks), 0) AS total_clicks,
           CASE WHEN SUM(s.impressions) > 0 
             THEN ROUND((CAST(SUM(s.clicks) AS REAL) / SUM(s.impressions)) * 100, 2)
             ELSE 0 END AS ctr
    FROM banners b
    LEFT JOIN banner_stats s ON b.id = s.banner_id
    GROUP BY b.id
    ORDER BY b.slot ASC, b.id ASC
  `).all();

  const headers = ['ID', 'Title', 'Slot', 'Active', 'Impressions', 'Clicks', 'CTR (%)'];
  const rows = [headers.join(',')];
  for (const s of stats) {
    rows.push([
      s.id,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      s.slot,
      s.active ? 'Yes' : 'No',
      s.total_impressions,
      s.total_clicks,
      s.ctr
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="banner-analytics.csv"');
  return res.send(rows.join('\n'));
});

// --- WHOLESALE RFQ / QUOTES INBOX ---

// GET /api/admin/quotes
router.get('/quotes', (req, res) => {
  const quotes = db.prepare('SELECT * FROM quote_requests ORDER BY id DESC').all();
  const formatted = quotes.map(q => {
    let items = [];
    try { items = JSON.parse(q.items); } catch { items = []; }
    return { ...q, items };
  });
  return res.json({ data: { quotes: formatted }, error: null });
});

// PATCH /api/admin/quotes/:id
router.patch('/quotes/:id', validateBody(adminSchemas.quoteUpdateSchema), (req, res) => {
  const { status, notes } = req.body;
  const quote = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ data: null, error: 'Quote request not found' });

  const updates = [];
  const params = [];
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE quote_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(req.params.id);
  return res.json({ data: { quote: updated }, error: null });
});

// POST /api/admin/quotes/:id/convert-to-estimate
router.post('/quotes/:id/convert-to-estimate', (req, res) => {
  const quote = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ data: null, error: 'Quote request not found' });

  let rawItems = [];
  try { rawItems = JSON.parse(quote.items); } catch { rawItems = []; }

  // Map quote items to estimate items
  const estItems = rawItems.map(it => ({
    productId: it.productId || it.id || 'custom-item',
    name: it.name || it.productName || 'Wholesale Product',
    description: it.specs ? JSON.stringify(it.specs) : '',
    quantity: Number(it.quantity) || 10,
    rate: Number(it.targetPrice || it.unitPrice || it.price || 1000),
    discountPercent: 0,
    taxRate: 18
  }));

  const settings = getSettingsMap();
  const estimateNumber = getNextSequence('estimate', settings.estimate_prefix || 'EST-');

  const totals = calculateDocumentTotals({
    items: estItems,
    discountAmount: 0,
    shippingAmount: 0,
    placeOfSupply: 'Karnataka (29)'
  });

  const insertEst = db.prepare(`
    INSERT INTO estimates (
      estimate_number, customer_id, customer_name, customer_email, customer_phone,
      billing_address, estimate_date, valid_until, status, subtotal, discount_amount,
      tax_amount, shipping_amount, round_off, total, amount_in_words, notes, terms
    ) VALUES (
      ?, NULL, ?, ?, ?,
      ?, ?, ?, 'Draft', ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const estRes = insertEst.run(
    estimateNumber,
    quote.business_name || quote.contact_name,
    quote.email,
    quote.phone,
    JSON.stringify({ pincode: quote.pincode }),
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    totals.subtotal,
    totals.discountAmount,
    totals.totalTax,
    totals.shippingAmount,
    totals.roundOff,
    totals.total,
    totals.amountInWords,
    `Converted from ${quote.quote_number}. ${quote.notes || ''}`.trim(),
    settings.invoice_terms || ''
  );

  const estimateId = estRes.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO estimate_items (
      estimate_id, product_id, item_name, description, quantity, rate,
      discount_percent, discount_amount, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const calcItem of totals.calculatedItems) {
    insertItem.run(
      estimateId,
      calcItem.productId,
      calcItem.name,
      calcItem.description,
      calcItem.quantity,
      calcItem.rate,
      calcItem.discountPercent,
      calcItem.discountAmount,
      calcItem.taxRate,
      calcItem.taxAmount,
      calcItem.lineTotal
    );
  }

  // Update quote request status
  db.prepare('UPDATE quote_requests SET estimate_id = ?, status = ? WHERE id = ?').run(
    estimateId,
    'Quoted',
    quote.id
  );

  logActivity('create', 'estimate', estimateId, `Converted ${quote.quote_number} to estimate ${estimateNumber}`);

  return res.json({
    data: {
      estimateId,
      estimateNumber,
      message: `Quote successfully converted to Estimate ${estimateNumber}`
    },
    error: null
  });
});

// ==========================================
// 13. WHOLESALE APPLICATIONS & GROUPS
// ==========================================

// GET /api/admin/wholesale/applications?status=pending|approved|rejected|all
router.get('/wholesale/applications', (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT wa.*, u.email as user_email, u.name as user_name, u.group_id as user_group_id
    FROM wholesale_applications wa
    LEFT JOIN users u ON wa.user_id = u.id
  `;
  const params = [];
  if (status && status !== 'all') {
    sql += ' WHERE wa.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY wa.created_at DESC';
  const applications = db.prepare(sql).all(...params);
  return res.json({ data: { applications }, error: null });
});

// POST /api/admin/wholesale/applications/:id/approve
router.post('/wholesale/applications/:id/approve', (req, res) => {
  const appId = Number(req.params.id);
  const { groupId = 1 } = req.body || {};
  const app = db.prepare('SELECT * FROM wholesale_applications WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ data: null, error: 'Application not found.' });

  const group = db.prepare('SELECT * FROM wholesale_groups WHERE id = ?').get(Number(groupId));
  if (!group) return res.status(400).json({ data: null, error: 'Invalid wholesale group selected.' });

  const approveTx = db.transaction(() => {
    db.prepare(`
      UPDATE wholesale_applications
      SET status = 'approved', assigned_group_id = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(group.id, appId);

    if (app.user_id) {
      db.prepare(`
        UPDATE users
        SET buyer_type = 'wholesale', wholesale_status = 'approved', group_id = ?,
            business_name = COALESCE(business_name, ?), gstin = COALESCE(gstin, ?),
            phone = COALESCE(phone, ?), city = COALESCE(city, ?)
        WHERE id = ?
      `).run(group.id, app.business_name, app.gstin, app.phone, app.city, app.user_id);
    }
  });
  approveTx();

  logActivity('approve', 'wholesale_application', appId, `Approved wholesale application for ${app.business_name} (${group.name})`);
  return res.json({ data: { message: `Approved ${app.business_name} under ${group.name}` }, error: null });
});

// POST /api/admin/wholesale/applications/:id/reject
router.post('/wholesale/applications/:id/reject', (req, res) => {
  const appId = Number(req.params.id);
  const { reason = '' } = req.body || {};
  const app = db.prepare('SELECT * FROM wholesale_applications WHERE id = ?').get(appId);
  if (!app) return res.status(404).json({ data: null, error: 'Application not found.' });

  const rejectTx = db.transaction(() => {
    db.prepare(`
      UPDATE wholesale_applications
      SET status = 'rejected', rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason.trim() || 'Does not meet wholesale criteria.', appId);

    if (app.user_id) {
      db.prepare("UPDATE users SET wholesale_status = 'rejected' WHERE id = ?").run(app.user_id);
    }
  });
  rejectTx();

  logActivity('reject', 'wholesale_application', appId, `Rejected wholesale application for ${app.business_name}`);
  return res.json({ data: { message: `Rejected application for ${app.business_name}` }, error: null });
});

// POST /api/admin/wholesale/convert-customer
router.post('/wholesale/convert-customer', (req, res) => {
  const { userId, groupId = 1, businessName, gstin } = req.body || {};
  if (!userId) return res.status(400).json({ data: null, error: 'User ID is required.' });

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(Number(userId));
  if (!user) return res.status(404).json({ data: null, error: 'User account not found.' });

  const group = db.prepare('SELECT id, name FROM wholesale_groups WHERE id = ?').get(Number(groupId));
  if (!group) return res.status(400).json({ data: null, error: 'Invalid wholesale group.' });

  db.prepare(`
    UPDATE users
    SET buyer_type = 'wholesale', wholesale_status = 'approved', group_id = ?,
        business_name = COALESCE(?, business_name), gstin = COALESCE(?, gstin)
    WHERE id = ?
  `).run(group.id, businessName || user.name, gstin || null, user.id);

  logActivity('update', 'user', user.id, `Converted ${user.email} to wholesale (${group.name})`);
  return res.json({ data: { message: `${user.name} converted to wholesale (${group.name})` }, error: null });
});

// GET /api/admin/wholesale/groups
router.get('/wholesale/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM wholesale_groups ORDER BY id ASC').all();
  return res.json({ data: { groups }, error: null });
});

// POST /api/admin/wholesale/groups
router.post('/wholesale/groups', (req, res) => {
  const { name, extra_discount_percent = 0, credit_limit = 0, payment_terms = 'prepaid', min_order_value = 250000, free_shipping_threshold = 1000000 } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ data: null, error: 'Group name is required.' });

  const info = db.prepare(`
    INSERT INTO wholesale_groups (name, extra_discount_percent, credit_limit, payment_terms, min_order_value, free_shipping_threshold)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(name).trim(), Number(extra_discount_percent), Math.round(Number(credit_limit)), String(payment_terms), Math.round(Number(min_order_value)), Math.round(Number(free_shipping_threshold)));

  logActivity('create', 'wholesale_group', info.lastInsertRowid, `Created wholesale group ${name}`);
  return res.status(201).json({ data: { id: info.lastInsertRowid }, error: null });
});

// PUT /api/admin/wholesale/groups/:id
router.put('/wholesale/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM wholesale_groups WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ data: null, error: 'Group not found.' });

  const { name, extra_discount_percent, credit_limit, payment_terms, min_order_value, free_shipping_threshold } = req.body || {};
  db.prepare(`
    UPDATE wholesale_groups
    SET name = ?, extra_discount_percent = ?, credit_limit = ?, payment_terms = ?, min_order_value = ?, free_shipping_threshold = ?
    WHERE id = ?
  `).run(
    name !== undefined ? String(name).trim() : existing.name,
    extra_discount_percent !== undefined ? Number(extra_discount_percent) : existing.extra_discount_percent,
    credit_limit !== undefined ? Math.round(Number(credit_limit)) : existing.credit_limit,
    payment_terms !== undefined ? String(payment_terms) : existing.payment_terms,
    min_order_value !== undefined ? Math.round(Number(min_order_value)) : existing.min_order_value,
    free_shipping_threshold !== undefined ? Math.round(Number(free_shipping_threshold)) : existing.free_shipping_threshold,
    id
  );

  logActivity('update', 'wholesale_group', id, `Updated wholesale group ${name || existing.name}`);
  return res.json({ data: { message: 'Wholesale group updated' }, error: null });
});

// DELETE /api/admin/wholesale/groups/:id
router.delete('/wholesale/groups/:id', (req, res) => {
  const id = Number(req.params.id);
  const inUse = db.prepare('SELECT COUNT(*) as c FROM users WHERE group_id = ?').get(id);
  if (inUse?.c > 0) return res.status(409).json({ data: null, error: 'Cannot delete group with assigned buyers.' });
  db.prepare('DELETE FROM wholesale_groups WHERE id = ?').run(id);
  return res.json({ data: { message: 'Wholesale group deleted' }, error: null });
});

export default router;
