// server/db/migrate_dual_cart.js
// Migration for Dual Cart System & Wholesale Buyer Ecosystem

import db from '../index.js';

console.log('🔄 Starting Dual Cart & Wholesale Buyer Database Migration...');

// Helper to check if a column exists
function columnExists(table, column) {
  try {
    const columns = db.pragma(`table_info(${table})`);
    return columns.some(c => c.name === column);
  } catch {
    return false;
  }
}

// 1. Create wholesale_groups table
db.exec(`
  CREATE TABLE IF NOT EXISTS wholesale_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    extra_discount_percent REAL DEFAULT 0,
    credit_limit INTEGER DEFAULT 0, -- in paise
    payment_terms TEXT DEFAULT 'prepaid', -- prepaid, net_15, net_30, net_60
    min_order_value INTEGER DEFAULT 250000, -- in paise (₹2,500)
    free_shipping_threshold INTEGER DEFAULT 1000000, -- in paise (₹10,000)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('  ✓ Verified wholesale_groups table');

// Seed default groups if empty
const groupCount = db.prepare('SELECT COUNT(*) as cnt FROM wholesale_groups').get().cnt;
if (groupCount === 0) {
  const insertGroup = db.prepare(`
    INSERT INTO wholesale_groups (name, extra_discount_percent, credit_limit, payment_terms, min_order_value, free_shipping_threshold)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertGroup.run('Bronze Buyer', 0, 0, 'prepaid', 250000, 1000000);
  insertGroup.run('Silver Merchant', 2, 2500000, 'net_15', 250000, 800000);
  insertGroup.run('Gold Distributor', 5, 10000000, 'net_30', 250000, 500000);
  insertGroup.run('Platinum Partner', 8, 25000000, 'net_60', 200000, 0);
  console.log('  ✓ Seeded default wholesale tiers: Bronze, Silver, Gold, Platinum');
}

// 2. Create wholesale_applications table
db.exec(`
  CREATE TABLE IF NOT EXISTS wholesale_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    gstin TEXT,
    city TEXT NOT NULL,
    business_type TEXT NOT NULL, -- shop, reseller, corporate, distributor
    expected_monthly_volume TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    assigned_group_id INTEGER REFERENCES wholesale_groups(id),
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('  ✓ Verified wholesale_applications table');

// 3. Create wholesale_cart_items table
db.exec(`
  CREATE TABLE IF NOT EXISTS wholesale_cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
  );
`);
console.log('  ✓ Verified wholesale_cart_items table');

// 4. Create saved_lists table
db.exec(`
  CREATE TABLE IF NOT EXISTS saved_lists (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items TEXT NOT NULL, -- JSON string
    item_count INTEGER DEFAULT 0,
    total_value INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('  ✓ Verified saved_lists table');

// 5. Create price_lists table (per-buyer special prices)
db.exec(`
  CREATE TABLE IF NOT EXISTS price_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    custom_price INTEGER NOT NULL,
    min_qty INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, min_qty)
  );
`);
console.log('  ✓ Verified price_lists table');

// 6. Create credit_ledger table
db.exec(`
  CREATE TABLE IF NOT EXISTS credit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id),
    entry_type TEXT NOT NULL, -- invoice, payment, credit_note, adjustment
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('  ✓ Verified credit_ledger table');

// 7. Alter existing users table
const userCols = [
  { name: 'buyer_type', type: "TEXT DEFAULT 'retail'" },
  { name: 'wholesale_status', type: "TEXT DEFAULT 'none'" },
  { name: 'group_id', type: 'INTEGER REFERENCES wholesale_groups(id)' },
  { name: 'business_name', type: 'TEXT' },
  { name: 'gstin', type: 'TEXT' },
  { name: 'phone', type: 'TEXT' },
  { name: 'city', type: 'TEXT' },
  { name: 'business_type', type: 'TEXT' },
  { name: 'expected_monthly_volume', type: 'TEXT' },
  { name: 'credit_limit_override', type: 'INTEGER' }
];

for (const col of userCols) {
  if (!columnExists('users', col.name)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'users.${col.name}'`);
  }
}

// 8. Alter discounts table
const discountCols = [
  { name: 'audience', type: "TEXT DEFAULT 'both'" }, // retail, wholesale, both
  { name: 'group_ids', type: 'TEXT' }, // JSON array of group IDs or NULL for all
  { name: 'buyer_ids', type: 'TEXT' }, // JSON array of buyer IDs or NULL for all
  { name: 'volume_tiers', type: 'TEXT' } // JSON array of volume brackets
];

for (const col of discountCols) {
  if (!columnExists('discounts', col.name)) {
    db.exec(`ALTER TABLE discounts ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'discounts.${col.name}'`);
  }
}

// 9. Alter orders table
const orderCols = [
  { name: 'channel', type: "TEXT DEFAULT 'retail'" }, // retail, wholesale
  { name: 'group_id', type: 'INTEGER' },
  { name: 'po_number', type: 'TEXT' },
  { name: 'delivery_notes', type: 'TEXT' },
  { name: 'credit_terms', type: 'TEXT' }
];

for (const col of orderCols) {
  if (!columnExists('orders', col.name)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'orders.${col.name}'`);
  }
}

// 10. Alter invoices table
const invoiceCols = [
  { name: 'channel', type: "TEXT DEFAULT 'retail'" },
  { name: 'invoice_type', type: "TEXT DEFAULT 'gst'" } // retail, gst
];

for (const col of invoiceCols) {
  if (!columnExists('invoices', col.name)) {
    db.exec(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'invoices.${col.name}'`);
  }
}

// 11. Alter products table
const productCols = [
  { name: 'is_retail_available', type: 'BOOLEAN DEFAULT 1' },
  { name: 'is_wholesale_available', type: 'BOOLEAN DEFAULT 1' },
  { name: 'step_quantity', type: 'INTEGER DEFAULT 1' },
  { name: 'tier4_qty', type: 'INTEGER' },
  { name: 'tier4_price', type: 'INTEGER' }
];

for (const col of productCols) {
  if (!columnExists('products', col.name)) {
    db.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'products.${col.name}'`);
  }
}

// 12. Alter banners table
if (!columnExists('banners', 'audience')) {
  db.exec(`ALTER TABLE banners ADD COLUMN audience TEXT DEFAULT 'both'`);
  console.log(`  + Added column 'banners.audience'`);
}

// 13. Ensure default settings
const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);
insertSetting.run('wholesale_enabled', 'true');
insertSetting.run('wholesale_auto_approve_gstin', 'false');
insertSetting.run('wholesale_show_teaser_prices', 'true');
insertSetting.run('wholesale_default_mov', '2500');
insertSetting.run('wholesale_default_free_shipping', '10000');

console.log('✅ Dual Cart & Wholesale Database Migration completed successfully.');
