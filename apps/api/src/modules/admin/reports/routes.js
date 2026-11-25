import { Router } from 'express';
import db from '../../../../db/index.js';

const router = Router();

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

export default router;
