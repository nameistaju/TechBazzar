import db from '../index.js';
import { generateSampleBanners } from '../seeds/generateSampleBanners.js';

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
  { name: 'deleted_at', type: 'DATETIME' },
  // Wholesale Bulk-Buying Attributes
  { name: 'moq', type: 'INTEGER DEFAULT 10' },
  { name: 'pack_size', type: 'INTEGER DEFAULT 5' },
  { name: 'tier1_qty', type: 'INTEGER DEFAULT 10' },
  { name: 'tier1_price', type: 'INTEGER DEFAULT 0' },
  { name: 'tier2_qty', type: 'INTEGER DEFAULT 50' },
  { name: 'tier2_price', type: 'INTEGER DEFAULT 0' },
  { name: 'tier3_qty', type: 'INTEGER DEFAULT 100' },
  { name: 'tier3_price', type: 'INTEGER DEFAULT 0' },
  { name: 'suggested_retail_price', type: 'INTEGER DEFAULT 0' }
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
  { name: 'payment_status', type: 'TEXT DEFAULT "Paid"' },
  // Wholesale B2B Attributes
  { name: 'business_name', type: 'TEXT' },
  { name: 'gstin', type: 'TEXT' },
  { name: 'billing_address', type: 'TEXT' },
  { name: 'advance_amount', type: 'INTEGER DEFAULT 0' },
  { name: 'balance_amount', type: 'INTEGER DEFAULT 0' },
  { name: 'is_advance_payment', type: 'BOOLEAN DEFAULT 0' },
  { name: 'invoice_id', type: 'INTEGER' }
];

for (const col of orderColumns) {
  if (!columnExists('orders', col.name)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'orders.${col.name}'`);
  }
}

// 3b. Upgrade order_items table
const orderItemColumns = [
  { name: 'tier_applied', type: 'INTEGER DEFAULT 1' },
  { name: 'unit_price', type: 'INTEGER DEFAULT 0' },
  { name: 'tax_rate', type: 'REAL DEFAULT 18' },
  { name: 'tax_amount', type: 'INTEGER DEFAULT 0' }
];

for (const col of orderItemColumns) {
  if (!columnExists('order_items', col.name)) {
    db.exec(`ALTER TABLE order_items ADD COLUMN ${col.name} ${col.type}`);
    console.log(`  + Added column 'order_items.${col.name}'`);
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

  -- Quote Requests (Wholesale RFQ / Inquiries from /quote)
  CREATE TABLE IF NOT EXISTS quote_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Replied', 'Accepted', 'Rejected'
    business_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    gstin TEXT,
    pincode TEXT,
    items TEXT NOT NULL, -- JSON array of items: [{ product_id, name, quantity, target_price }]
    target_price INTEGER,
    notes TEXT,
    estimate_id INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Banner & Ad Management System (Dual-Image: 3:1 Desktop, 4:3 Mobile)
  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slot TEXT NOT NULL, -- 'home-mid-1' | 'home-mid-2' | 'home-mid-3' | 'category-inline' | 'cart-promo' | 'product-below'
    desktop_image TEXT NOT NULL,
    mobile_image TEXT,
    thumb TEXT,
    focal_x REAL DEFAULT 50,
    focal_y REAL DEFAULT 50,
    alt TEXT NOT NULL,
    link_type TEXT DEFAULT 'none', -- 'product' | 'category' | 'brand' | 'coupon' | 'page' | 'external' | 'none'
    link_target TEXT,
    new_tab BOOLEAN DEFAULT 0,
    label TEXT, -- null | 'Ad' | 'Offer' | 'New'
    starts_at DATETIME,
    ends_at DATETIME,
    active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Banner Performance Stats (Daily aggregates)
  CREATE TABLE IF NOT EXISTS banner_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    banner_id INTEGER NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    UNIQUE(banner_id, date)
  );
`);

console.log('  ✓ Verified all secondary tables (stock_movements, discounts, estimates, invoices, quote_requests, banners, etc.)');

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
initCounter('quote_request', 1);

// 6. Wholesale System Settings
const wholesaleSettings = [
  { key: 'min_order_value', value: '2500' },
  { key: 'free_shipping_threshold', value: '10000' },
  { key: 'wholesale_prices_only_registered', value: '0' },
  { key: 'allow_custom_quotes', value: '1' }
];

const insertSetting = db.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO NOTHING
`);

db.transaction(() => {
  for (const s of wholesaleSettings) {
    insertSetting.run(s.key, s.value);
  }
})();
console.log('  ✓ Initialized wholesale system settings');

// 7. Backfill Products with SKU, Cost Price, MRP, Images JSON, and 3-Tier Wholesale Pricing
const wholesaleCategories = {
  'chargers-cables': { moq: 20, packSize: 5, t1Qty: 20, t2Qty: 50, t3Qty: 100, t2Disc: 0.12, t3Disc: 0.22 },
  'phone-cases': { moq: 20, packSize: 5, t1Qty: 20, t2Qty: 50, t3Qty: 100, t2Disc: 0.12, t3Disc: 0.22 },
  'earbuds': { moq: 10, packSize: 5, t1Qty: 10, t2Qty: 50, t3Qty: 100, t2Disc: 0.08, t3Disc: 0.16 },
  'headphones': { moq: 10, packSize: 5, t1Qty: 10, t2Qty: 50, t3Qty: 100, t2Disc: 0.08, t3Disc: 0.16 },
  'speakers': { moq: 10, packSize: 5, t1Qty: 10, t2Qty: 50, t3Qty: 100, t2Disc: 0.08, t3Disc: 0.16 },
  'power-banks': { moq: 10, packSize: 5, t1Qty: 10, t2Qty: 50, t3Qty: 100, t2Disc: 0.10, t3Disc: 0.18 },
  'smartwatches': { moq: 5, packSize: 2, t1Qty: 5, t2Qty: 20, t3Qty: 50, t2Disc: 0.07, t3Disc: 0.14 },
  'gaming': { moq: 5, packSize: 2, t1Qty: 5, t2Qty: 20, t3Qty: 50, t2Disc: 0.07, t3Disc: 0.14 },
  'cameras-cctv': { moq: 5, packSize: 2, t1Qty: 5, t2Qty: 20, t3Qty: 50, t2Disc: 0.08, t3Disc: 0.15 },
  'smartphones': { moq: 2, packSize: 1, t1Qty: 2, t2Qty: 5, t3Qty: 10, t2Disc: 0.04, t3Disc: 0.08 },
  'laptops': { moq: 2, packSize: 1, t1Qty: 2, t2Qty: 5, t3Qty: 10, t2Disc: 0.04, t3Disc: 0.08 }
};
const defaultWholesaleConfig = { moq: 5, packSize: 2, t1Qty: 5, t2Qty: 20, t3Qty: 50, t2Disc: 0.08, t3Disc: 0.16 };

const products = db.prepare('SELECT id, name, category, price, original_price, image, sku, cost_price, mrp, images, stock, moq FROM products').all();

const updateStmt = db.prepare(`
  UPDATE products
  SET 
    sku = COALESCE(sku, ?),
    cost_price = CASE WHEN cost_price = 0 OR cost_price IS NULL THEN ? ELSE cost_price END,
    mrp = CASE WHEN mrp = 0 OR mrp IS NULL THEN ? ELSE mrp END,
    images = COALESCE(images, ?),
    moq = ?,
    pack_size = ?,
    tier1_qty = ?,
    tier1_price = ?,
    tier2_qty = ?,
    tier2_price = ?,
    tier3_qty = ?,
    tier3_price = ?,
    suggested_retail_price = ?,
    stock = CASE WHEN stock < ? THEN ? ELSE stock END
  WHERE id = ?
`);

const backfillTx = db.transaction((items) => {
  let count = 0;
  for (const [idx, p] of items.entries()) {
    const catCode = (p.category || 'GEN').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const autoSku = p.sku || `TB-${catCode}-${String(idx + 1).padStart(4, '0')}`;
    const basePrice = p.price || 1000;
    const costPrice = p.cost_price || Math.round(basePrice * 0.65);
    const mrp = p.mrp || (p.original_price && p.original_price > basePrice ? p.original_price : Math.round(basePrice * 1.35));
    const imagesJson = p.images || JSON.stringify([p.image]);

    const cfg = wholesaleCategories[p.category] || defaultWholesaleConfig;
    const t1Price = basePrice;
    const t2Price = Math.round(basePrice * (1 - cfg.t2Disc));
    const t3Price = Math.round(basePrice * (1 - cfg.t3Disc));
    const suggestedRetailPrice = mrp;
    const minStock = cfg.moq * 3;

    updateStmt.run(
      autoSku,
      costPrice,
      mrp,
      imagesJson,
      cfg.moq,
      cfg.packSize,
      cfg.t1Qty,
      t1Price,
      cfg.t2Qty,
      t2Price,
      cfg.t3Qty,
      t3Price,
      suggestedRetailPrice,
      minStock,
      minStock,
      p.id
    );
    count++;
  }
  return count;
});

const updatedCount = backfillTx(products);
console.log(`  ✓ Backfilled ${updatedCount} products with wholesale MOQs, pack sizes, and 3-tier price brackets`);

// 8. Generate and Seed Sample Banners
await generateSampleBanners();

const bannerCount = db.prepare('SELECT COUNT(*) as count FROM banners').get();
if (bannerCount.count === 0) {
  const insertBanner = db.prepare(`
    INSERT INTO banners (
      title, slot, desktop_image, mobile_image, thumb, alt, link_type, link_target, label, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const initialBanners = [
    {
      title: 'FESTIVE BULK DEALS - Extra 15% Off Orders Above ₹50,000',
      slot: 'home-mid-1',
      desktop_image: '/uploads/banners/festive-deals-desktop.webp',
      mobile_image: '/uploads/banners/festive-deals-mobile.webp',
      thumb: '/uploads/banners/festive-deals-thumb.webp',
      alt: 'Festive wholesale discounts on bulk electronics purchases',
      link_type: 'coupon',
      link_target: 'FESTIVE25',
      label: 'Offer',
      sort_order: 1
    },
    {
      title: 'FACTORY DIRECT SMART AUDIO - High-Margin Resale Inventory',
      slot: 'home-mid-2',
      desktop_image: '/uploads/banners/smart-audio-desktop.webp',
      mobile_image: '/uploads/banners/smart-audio-mobile.webp',
      thumb: '/uploads/banners/smart-audio-thumb.webp',
      alt: 'Factory direct wireless audio for retail shop owners',
      link_type: 'category',
      link_target: 'earbuds',
      label: 'New',
      sort_order: 1
    },
    {
      title: 'TECHBAZAAR B2B PARTNER CLUB - Priority Allocation & 30-Day Credit',
      slot: 'home-mid-3',
      desktop_image: '/uploads/banners/b2b-partner-desktop.webp',
      mobile_image: '/uploads/banners/b2b-partner-mobile.webp',
      thumb: '/uploads/banners/b2b-partner-thumb.webp',
      alt: 'Join TechBazaar wholesale B2B reseller partner network',
      link_type: 'page',
      link_target: '/quote',
      label: 'Ad',
      sort_order: 1
    }
  ];

  db.transaction(() => {
    for (const b of initialBanners) {
      insertBanner.run(
        b.title,
        b.slot,
        b.desktop_image,
        b.mobile_image,
        b.thumb,
        b.alt,
        b.link_type,
        b.link_target,
        b.label,
        b.sort_order
      );
    }
  })();
  console.log('  ✓ Seeded 3 default active banners across home-mid-1, home-mid-2, home-mid-3 slots');
}

console.log('✅ TechBazaar Database Migration Completed Successfully!\n');
