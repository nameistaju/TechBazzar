import { Router } from 'express';
import db from '../../../../db/index.js';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { logActivity } from '../helpers.js';

const router = Router();

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

export default router;
