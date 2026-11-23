import db from './index.js';

console.log('🔄 Starting TechBazaar Database Migration...');

// Helper to check if a column exists
function columnExists(table, column) {
  const columns = db.pragma(`table_info(${table})`);
  return columns.some(c => c.name === column);
}

// 1. Upgrade products table
const productColumns = [
  { name: 'sku', type: 'TEXT' },
  { name: 'cost_price', type: 'INTEGER DEFAULT 0' },
  { name: 'mrp', type: 'INTEGER DEFAULT 0' },
  { name: 'gst_rate', type: 'REAL DEFAULT 18' },
  { name: 'is_tax_inclusive', type: 'BOOLEAN DEFAULT 1' },
  { name: 'low_stock_threshold', type: 'INTEGER DEFAULT 3' },
  { name: 'track_inventory', type: 'BOOLEAN DEFAULT 1' },
  { name: 'allow_backorder', type: 'BOOLEAN DEFAULT 0' },
  { name: 'supplier', type: 'TEXT DEFAULT "TechBazaar Direct"' },
  { name: 'status', type: 'TEXT DEFAULT "active"' },
  { name: 'images', type: 'TEXT' },
  { name: 'variants', type: 'TEXT' },
  { name: 'seo', type: 'TEXT' },
  { name: 'sale_price', type: 'INTEGER' },
  { name: 'sale_starts_at', type: 'DATETIME' },
  { name: 'sale_ends_at', type: 'DATETIME' },
  { name: 'featured_hero', type: 'BOOLEAN DEFAULT 0' },
  { name: 'deleted_at', type: 'DATETIME' }
];

for (const col of productColumns) {
  if (!columnExists('products', col.name)) {
    db.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'products.${col.name}'`);
  }
}

// 2. Upgrade users table
if (!columnExists('users', 'must_change_password')) {
  db.exec(`ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0`);
  console.log(`  + Added column 'users.must_change_password'`);
}

// 3. Upgrade orders table
const orderColumns = [
  { name: 'courier_name', type: 'TEXT' },
  { name: 'tracking_number', type: 'TEXT' },
  { name: 'discount_code', type: 'TEXT' },
  { name: 'discount_amount', type: 'INTEGER DEFAULT 0' },
  { name: 'internal_notes', type: 'TEXT' },
  { name: 'payment_status', type: 'TEXT DEFAULT "Paid"' }
];

for (const col of orderColumns) {
  if (!columnExists('orders', col.name)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'orders.${col.name}'`);
  }
}

// 4. Create New Tables
db.exec(`
  -- Stock Movements Log
  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reason TEXT NOT NULL, -- 'restock', 'sale', 'damaged', 'return', 'correction', 'invoice', 'void'
    reference_id TEXT,    -- Order number, invoice number, or adjustment tag
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Advanced Discounts Engine
  CREATE TABLE IF NOT EXISTS discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,     -- Null for automatic discounts
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,   -- 'percentage', 'flat', 'rule_higher', 'rule_lower'
    value INTEGER NOT NULL, -- % or flat INR
    rule_percentage REAL, -- e.g. 25
    rule_flat INTEGER,    -- e.g. 200
    rule_mode TEXT,       -- 'higher' | 'lower'
    scope TEXT NOT NULL DEFAULT 'cart', -- 'cart', 'products', 'categories', 'brands'
    scope_values TEXT,    -- JSON array
    min_cart_amount INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    first_order_only BOOLEAN DEFAULT 0,
    stackable BOOLEAN DEFAULT 0,
    priority INTEGER DEFAULT 1,
    usage_limit INTEGER,  -- null = unlimited
    used_count INTEGER DEFAULT 0,
    limit_per_customer INTEGER DEFAULT 1,
    starts_at DATETIME,
    ends_at DATETIME,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS discount_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discount_id INTEGER NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    invoice_id INTEGER,
    customer_email TEXT NOT NULL,
    amount_saved INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Customers Directory
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    gstin TEXT,
    billing_address TEXT,  -- JSON
    shipping_address TEXT, -- JSON
    tags TEXT,             -- JSON array
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Estimates (Quotations)
  CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    billing_address TEXT,  -- JSON
    estimate_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'
    subtotal INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    shipping_amount INTEGER DEFAULT 0,
    round_off REAL DEFAULT 0,
    total INTEGER NOT NULL,
    amount_in_words TEXT,
    notes TEXT,
    terms TEXT,
    converted_invoice_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS estimate_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    product_id TEXT,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    rate INTEGER NOT NULL,
    discount_percent REAL DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    tax_rate REAL DEFAULT 18,
    tax_amount INTEGER DEFAULT 0,
    line_total INTEGER NOT NULL
  );

  -- Invoices
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    estimate_id INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_gstin TEXT,
    place_of_supply TEXT DEFAULT 'Karnataka (29)',
    billing_address TEXT,  -- JSON
    shipping_address TEXT, -- JSON
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms TEXT DEFAULT 'Due on receipt',
    status TEXT DEFAULT 'Unpaid', -- 'Unpaid', 'Partially paid', 'Paid', 'Overdue', 'Cancelled', 'Void'
    subtotal INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    taxable_value INTEGER NOT NULL,
    cgst_amount INTEGER DEFAULT 0,
    sgst_amount INTEGER DEFAULT 0,
    igst_amount INTEGER DEFAULT 0,
    shipping_amount INTEGER DEFAULT 0,
    round_off REAL DEFAULT 0,
    total INTEGER NOT NULL,
    amount_paid INTEGER DEFAULT 0,
    balance_due INTEGER NOT NULL,
    amount_in_words TEXT,
    notes TEXT,
    terms TEXT,
    void_reason TEXT,
    template TEXT DEFAULT 'standard', -- 'standard' | 'compact'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id TEXT,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    rate INTEGER NOT NULL,
    discount_percent REAL DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    tax_rate REAL DEFAULT 18,
    tax_amount INTEGER DEFAULT 0,
    line_total INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- 'bank_transfer', 'upi', 'cash', 'card', 'cheque'
    payment_date DATE NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS credit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credit_note_number TEXT UNIQUE NOT NULL,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Store and System Settings
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Activity Log (Audit Trail)
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'stock_change', 'price_change', 'status_change', 'void'
    entity_type TEXT NOT NULL, -- 'product', 'order', 'invoice', 'estimate', 'discount', 'customer', 'setting'
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    before_state TEXT,    -- JSON
    after_state TEXT,     -- JSON
    undoable BOOLEAN DEFAULT 0,
    undone BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Counters for Transaction-Safe Sequencing
  CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    current_value INTEGER NOT NULL
  );
`);

console.log('  ✓ Verified all secondary tables (stock_movements, discounts, estimates, invoices, etc.)');

// 5. Initialize Counters if not set
const initCounter = (name, initialVal) => {
  db.prepare(`
    INSERT INTO counters (name, current_value)
    VALUES (?, ?)
    ON CONFLICT(name) DO NOTHING
  `).run(name, initialVal);
};

initCounter('invoice', 1);
initCounter('estimate', 1);
initCounter('credit_note', 1);

// 6. Backfill Products with SKU, Cost Price, MRP, and Images JSON
const products = db.prepare('SELECT id, name, category, price, original_price, image, sku, cost_price, mrp, images FROM products').all();

const updateStmt = db.prepare(`
  UPDATE products
  SET 
    sku = COALESCE(sku, ?),
    cost_price = CASE WHEN cost_price = 0 OR cost_price IS NULL THEN ? ELSE cost_price END,
    mrp = CASE WHEN mrp = 0 OR mrp IS NULL THEN ? ELSE mrp END,
    images = COALESCE(images, ?)
  WHERE id = ?
`);

const backfillTx = db.transaction((items) => {
  let count = 0;
  for (const [idx, p] of items.entries()) {
    const catCode = (p.category || 'GEN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const autoSku = p.sku || `TB-${catCode}-${String(idx + 1).padStart(4, '0')}`;
    const costPrice = p.cost_price || Math.round(p.price * 0.65);
    const mrp = p.mrp || (p.original_price && p.original_price > p.price ? p.original_price : Math.round(p.price * 1.2));
    const imagesJson = p.images || JSON.stringify([p.image]);

    updateStmt.run(autoSku, costPrice, mrp, imagesJson, p.id);
    count++;
  }
  return count;
});

const updatedCount = backfillTx(products);
console.log(`  ✓ Backfilled ${updatedCount} products with SKU, Cost Price, MRP, and Images JSON`);

console.log('✅ TechBazaar Database Migration Completed Successfully!\n');
