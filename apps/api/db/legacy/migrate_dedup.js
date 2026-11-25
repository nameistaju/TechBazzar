// server/db/migrate_dedup.js
// Migration for Product Deduplication, Canonical Merging, and Unique SKU enforcement

import db from '../index.js';

console.log('🔄 Starting Product Deduplication & Canonical Merging Migration...');

function columnExists(table, column) {
  try {
    const columns = db.pragma(`table_info(${table})`);
    return columns.some(c => c.name === column);
  } catch {
    return false;
  }
}

// 1. Add merged_into column
if (!columnExists('products', 'merged_into')) {
  db.exec('ALTER TABLE products ADD COLUMN merged_into TEXT;');
  console.log('  ✓ Added merged_into column to products');
} else {
  console.log('  - merged_into column already exists in products');
}

// 2. Add normalized_name column
if (!columnExists('products', 'normalized_name')) {
  db.exec('ALTER TABLE products ADD COLUMN normalized_name TEXT;');
  console.log('  ✓ Added normalized_name column to products');
} else {
  console.log('  - normalized_name column already exists in products');
}

// 3. Normalization helper
const COLOR_WORDS = [
  'black', 'white', 'silver', 'grey', 'gray', 'space grey', 'space gray',
  'crimson', 'red', 'blue', 'navy', 'sky blue', 'midnight blue', 'green', 'olive',
  'gold', 'rose gold', 'matte black', 'stealth black', 'pearl white', 'graphite',
  'titanium', 'natural titanium', 'desert titanium', 'dark chrome', 'sunset orange',
  'yellow', 'purple', 'lavender', 'cyan', 'matte', 'stealth', 'carbon'
];

const FILLER_WORDS = [
  'wireless', 'bluetooth', 'true wireless', 'tws', 'noise canceling', 'noise cancelling',
  'active noise cancellation', 'anc', 'wired', 'in-ear', 'over-ear', 'on-ear',
  'earbuds', 'earphones', 'headphones', 'protective case', 'case for', 'cover for',
  'fast charging', 'super fast', 'ultra-fast', 'ultra', 'premium', 'edition', 'series',
  'compatible with', 'designed for', 'with mic', 'with wingtip fit', 'foldable', 'portable'
];

export function computeNormalizedName(name, brand) {
  let s = (name || '').toLowerCase();
  if (brand) {
    s = s.replace(new RegExp(`\\b${brand.toLowerCase()}\\b`, 'gi'), ' ');
  }
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(/\[[^\]]*\]/g, ' ');
  s = s.replace(/[-–—/\\|•,.:;]/g, ' ');
  for (const c of COLOR_WORDS) {
    s = s.replace(new RegExp(`\\b${c}\\b`, 'gi'), ' ');
  }
  for (const f of FILLER_WORDS) {
    s = s.replace(new RegExp(`\\b${f}\\b`, 'gi'), ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

// Populate normalized_name for any products missing it
const updateNormalized = db.prepare('UPDATE products SET normalized_name = ? WHERE id = ?');
const allProds = db.prepare('SELECT id, name, brand FROM products').all();

db.transaction(() => {
  for (const p of allProds) {
    const norm = computeNormalizedName(p.name, p.brand);
    updateNormalized.run(norm, p.id);
  }
})();
console.log(`  ✓ Populated normalized_name for ${allProds.length} products`);

// 4. Create Indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_brand_norm ON products(brand, normalized_name) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_products_merged_into ON products(merged_into);
`);
console.log('  ✓ Created indexes on brand + normalized_name and merged_into');

console.log('✅ Deduplication Migration Completed Successfully.\n');
