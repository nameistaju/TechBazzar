import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody, validateQuery } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { formatProduct } from '../../../modules/catalog/routes.js';
import { logActivity } from '../helpers.js';

const router = Router();

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

export default router;
