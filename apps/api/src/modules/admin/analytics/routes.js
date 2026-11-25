import { Router } from 'express';
import db from '../../../../db/index.js';

const router = Router();

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

export default router;
