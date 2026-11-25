import bcrypt from 'bcryptjs';
import db from './index.js';
import { products } from '../../src/data/products.js';
import { computeNormalizedName } from '../services/dedupService.js';

console.log('🌱 Starting TechBazaar Database Seeding...');

// 1. Seed Admin & Test Customer Users
const seedUsers = () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@techbazaar.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: ADMIN_EMAIL or ADMIN_PASSWORD not set in env! Using default dev seed credentials and forcing password change on login.');
  }

  const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);
  const customerPasswordHash = bcrypt.hashSync('customer123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, must_change_password)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      name = excluded.name,
      role = excluded.role,
      must_change_password = excluded.must_change_password
  `);

  insertUser.run(adminEmail, adminPasswordHash, 'TechBazaar Administrator', 'admin', 1);
  insertUser.run('customer@techbazaar.com', customerPasswordHash, 'Aarav Sharma', 'customer', 0);

  console.log(`  ✓ Seeded admin user: ${adminEmail} (must_change_password = 1)`);
  console.log('  ✓ Seeded demo customer: customer@techbazaar.com');
};

// 2. Seed Products
const seedProducts = () => {
  // Ensure performance & dedup indices exist
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE deleted_at IS NULL').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_products_brand_norm ON products(brand, normalized_name)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_products_merged_into ON products(merged_into)').run();

  const findExistingStmt = db.prepare(`
    SELECT id, deleted_at, merged_into FROM products WHERE id = ?
  `);

  const findByBrandNormStmt = db.prepare(`
    SELECT id, deleted_at, merged_into FROM products 
    WHERE LOWER(brand) = LOWER(?) AND normalized_name = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO products (
      id, name, brand, category, price, original_price, mrp, rating, reviews_count,
      image, images, variants, stock, is_flash_sale, is_trending, is_bestseller, is_new, is_recommended,
      tags, specs, short_description, sku, normalized_name, moq, pack_size,
      tier1_qty, tier1_price, tier2_qty, tier2_price, tier3_qty, tier3_price, suggested_retail_price
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE products SET
      name = ?, brand = ?, category = ?, price = ?, original_price = ?, mrp = ?,
      rating = ?, reviews_count = ?, image = ?, images = ?, variants = ?, stock = ?,
      is_flash_sale = ?, is_trending = ?, is_bestseller = ?, is_new = ?, is_recommended = ?,
      tags = ?, specs = ?, short_description = ?, sku = ?, normalized_name = ?,
      moq = ?, pack_size = ?, tier1_qty = ?, tier1_price = ?, tier2_qty = ?, tier2_price = ?,
      tier3_qty = ?, tier3_price = ?, suggested_retail_price = ?
    WHERE id = ?
  `);

  const seedTransaction = db.transaction((items) => {
    let count = 0;
    for (const [index, p] of items.entries()) {
      const brand = p.brand || 'TechBazaar';
      const normName = computeNormalizedName(p.name, brand);

      // Check if product was soft-deleted/merged
      const existingById = findExistingStmt.get(p.id);
      if (existingById && existingById.deleted_at) {
        continue;
      }

      const existingByNorm = findByBrandNormStmt.get(brand, normName);
      if (existingByNorm && existingByNorm.deleted_at) {
        continue;
      }

      const targetId = existingById ? existingById.id : (existingByNorm ? existingByNorm.id : p.id);

      let stock = 25;
      if (index === 3 || index === 17) {
        stock = 0;
      } else if (index === 2 || index === 12) {
        stock = 2;
      } else {
        stock = 10 + ((index * 7) % 35);
      }

      const basePrice = Math.round(Number(p.price || 0) * 100);
      const origPrice = Math.round(Number(p.originalPrice || 0) * 100);
      const mrp = Math.round(Number(p.mrp || 0) * 100) || origPrice || Math.round(basePrice * 1.35);
      const moq = Number(p.moq || 10);
      const packSize = Number(p.pack_size || p.packSize || 5);
      const t1Price = Math.round(Number(p.tier1_price || p.tier1Price || 0) * 100) || basePrice;
      const t2Price = Math.round(Number(p.tier2_price || p.tier2Price || 0) * 100) || Math.round(basePrice * 0.9);
      const t3Price = Math.round(Number(p.tier3_price || p.tier3Price || 0) * 100) || Math.round(basePrice * 0.8);
      const srp = Math.round(Number(p.suggestedRetailPrice || 0) * 100) || mrp;
      const imagesJson = JSON.stringify(p.images && p.images.length > 0 ? p.images : [p.image]);
      const variantsJson = JSON.stringify(p.variants || []);

      if (existingById || existingByNorm) {
        updateStmt.run(
          p.name, brand, p.category, basePrice, origPrice || mrp, mrp,
          p.rating || 4.5, p.reviewsCount || 0, p.image, imagesJson, variantsJson, stock,
          p.isFlashSale ? 1 : 0, p.isTrending ? 1 : 0, p.isBestseller ? 1 : 0, p.isNew ? 1 : 0, p.isRecommended ? 1 : 0,
          JSON.stringify(p.tags || []), JSON.stringify(p.specs || {}), p.shortDescription || '',
          p.sku, normName, moq, packSize, moq, t1Price, 50, t2Price, 100, t3Price, srp,
          targetId
        );
      } else {
        insertStmt.run(
          p.id, p.name, brand, p.category, basePrice, origPrice || mrp, mrp,
          p.rating || 4.5, p.reviewsCount || 0, p.image, imagesJson, variantsJson, stock,
          p.isFlashSale ? 1 : 0, p.isTrending ? 1 : 0, p.isBestseller ? 1 : 0, p.isNew ? 1 : 0, p.isRecommended ? 1 : 0,
          JSON.stringify(p.tags || []), JSON.stringify(p.specs || {}), p.shortDescription || '',
          p.sku, normName, moq, packSize, moq, t1Price, 50, t2Price, 100, t3Price, srp
        );
      }
      count++;
    }
    return count;
  });

  const totalSeeded = seedTransaction(products);
  console.log(`  ✓ Successfully seeded / synced ${totalSeeded} products with unique SKUs and galleries`);
};

// 3. Seed demo address for customer
const seedAddresses = () => {
  const customer = db.prepare('SELECT id FROM users WHERE email = ?').get('customer@techbazaar.com');
  if (customer) {
    const existing = db.prepare('SELECT id FROM addresses WHERE user_id = ?').get(customer.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO addresses (user_id, name, phone, address_line, city, state, pincode, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        customer.id,
        'Aarav Sharma',
        '+91 98765 43210',
        '42, Brigade Road, Indiranagar',
        'Bengaluru',
        'Karnataka',
        '560038'
      );
      console.log('  ✓ Seeded default shipping address for demo customer');
    }
  }
};

// Execute seeding
try {
  seedUsers();
  seedProducts();
  seedAddresses();
  console.log('✅ Database seeding complete!\n');
  process.exit(0);
} catch (error) {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
}
