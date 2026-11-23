-- TechBazaar SQLite Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  original_price INTEGER,
  rating REAL DEFAULT 4.5,
  reviews_count INTEGER DEFAULT 0,
  image TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 10,
  is_flash_sale BOOLEAN DEFAULT 0,
  is_trending BOOLEAN DEFAULT 0,
  is_bestseller BOOLEAN DEFAULT 0,
  is_new BOOLEAN DEFAULT 0,
  is_recommended BOOLEAN DEFAULT 0,
  tags TEXT, -- JSON array of tags
  specs TEXT, -- JSON object of specs
  short_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notify_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  tracking_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Placed',
  status_history TEXT NOT NULL, -- JSON array of status history steps
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  address TEXT NOT NULL, -- JSON snapshot of shipping address
  payment_method TEXT NOT NULL,
  courier_name TEXT,
  tracking_number TEXT,
  discount_code TEXT,
  discount_amount INTEGER DEFAULT 0,
  internal_notes TEXT,
  payment_status TEXT DEFAULT 'Paid',
  business_name TEXT,
  gstin TEXT,
  billing_address TEXT,
  advance_amount INTEGER DEFAULT 0,
  balance_amount INTEGER DEFAULT 0,
  is_advance_payment BOOLEAN DEFAULT 0,
  invoice_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  image TEXT NOT NULL,
  tier_applied INTEGER DEFAULT 1,
  unit_price INTEGER DEFAULT 0,
  tax_rate REAL DEFAULT 18,
  tax_amount INTEGER DEFAULT 0
);

-- Wholesale RFQ / Quote Requests
CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'Pending',
  business_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  gstin TEXT,
  pincode TEXT,
  items TEXT NOT NULL,
  target_price INTEGER,
  notes TEXT,
  estimate_id INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Banners & Ads Engine
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slot TEXT NOT NULL,
  desktop_image TEXT NOT NULL,
  mobile_image TEXT,
  thumb TEXT,
  focal_x REAL DEFAULT 50,
  focal_y REAL DEFAULT 50,
  alt TEXT NOT NULL,
  link_type TEXT DEFAULT 'none',
  link_target TEXT,
  new_tab BOOLEAN DEFAULT 0,
  label TEXT,
  starts_at DATETIME,
  ends_at DATETIME,
  active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Banner Performance Statistics
CREATE TABLE IF NOT EXISTS banner_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  banner_id INTEGER NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  UNIQUE(banner_id, date)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);
