import bcrypt from 'bcryptjs';
import db from './index.js';
import { products } from '../../src/data/products.js';

console.log('🌱 Starting TechBazaar Database Seeding...');

// 1. Seed Admin & Test Customer Users
const seedUsers = () => {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const customerPasswordHash = bcrypt.hashSync('customer123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      name = excluded.name,
      role = excluded.role
  `);

  insertUser.run('admin@techbazaar.com', adminPasswordHash, 'TechBazaar Administrator', 'admin');
  insertUser.run('customer@techbazaar.com', customerPasswordHash, 'Aarav Sharma', 'customer');

  console.log('  ✓ Seeded admin user: admin@techbazaar.com / admin123');
  console.log('  ✓ Seeded demo customer: customer@techbazaar.com / customer123');
};

// 2. Seed Products
const seedProducts = () => {
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, name, brand, category, price, original_price, rating, reviews_count,
      image, stock, is_flash_sale, is_trending, is_bestseller, is_new, is_recommended,
      tags, specs, short_description
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      brand = excluded.brand,
      category = excluded.category,
      price = excluded.price,
      original_price = excluded.original_price,
      rating = excluded.rating,
      reviews_count = excluded.reviews_count,
      image = excluded.image,
      stock = excluded.stock,
      is_flash_sale = excluded.is_flash_sale,
      is_trending = excluded.is_trending,
      is_bestseller = excluded.is_bestseller,
      is_new = excluded.is_new,
      is_recommended = excluded.is_recommended,
      tags = excluded.tags,
      specs = excluded.specs,
      short_description = excluded.short_description
  `);

  const seedTransaction = db.transaction((items) => {
    let count = 0;
    for (const [index, p] of items.entries()) {
      // Allocate realistic stock:
      // Index 3 and 7: Out of stock (0) to test Out-of-Stock badge & Notify Me
      // Index 2 and 5: Low stock (2) to test "Only 2 left" in orange
      // Others: 15-45 units
      let stock = 25;
      if (index === 3 || index === 17) {
        stock = 0; // Out of stock
      } else if (index === 2 || index === 12) {
        stock = 2; // Low stock
      } else {
        stock = 10 + ((index * 7) % 35);
      }

      insertProduct.run(
        p.id,
        p.name,
        p.brand || 'TechBazaar',
        p.category,
        p.price,
        p.originalPrice || null,
        p.rating || 4.5,
        p.reviewsCount || 0,
        p.image,
        stock,
        p.isFlashSale ? 1 : 0,
        p.isTrending ? 1 : 0,
        p.isBestseller ? 1 : 0,
        p.isNew ? 1 : 0,
        p.isRecommended ? 1 : 0,
        JSON.stringify(p.tags || []),
        JSON.stringify(p.specs || {}),
        p.shortDescription || ''
      );
      count++;
    }
    return count;
  });

  const totalSeeded = seedTransaction(products);
  console.log(`  ✓ Successfully seeded ${totalSeeded} products with stock allocations`);
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
