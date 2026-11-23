import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Helper to format product row from DB
export function formatProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    price: row.price,
    originalPrice: row.original_price,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    image: row.image,
    stock: row.stock,
    isFlashSale: Boolean(row.is_flash_sale),
    isTrending: Boolean(row.is_trending),
    isBestseller: Boolean(row.is_bestseller),
    isNew: Boolean(row.is_new),
    isRecommended: Boolean(row.is_recommended),
    tags: row.tags ? JSON.parse(row.tags) : [],
    specs: row.specs ? JSON.parse(row.specs) : {},
    shortDescription: row.short_description || ''
  };
}

// GET /api/products
router.get('/', (req, res) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    rating,
    inStock,
    sort = 'popularity',
    page = 1,
    limit = 24,
    flag
  } = req.query;

  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (brand) {
    conditions.push('LOWER(brand) = LOWER(?)');
    params.push(brand);
  }

  if (minPrice) {
    conditions.push('price >= ?');
    params.push(Number(minPrice));
  }

  if (maxPrice) {
    conditions.push('price <= ?');
    params.push(Number(maxPrice));
  }

  if (rating) {
    conditions.push('rating >= ?');
    params.push(Number(rating));
  }

  if (inStock === 'true' || inStock === '1') {
    conditions.push('stock > 0');
  }

  if (flag === 'flashSale') {
    conditions.push('is_flash_sale = 1');
  } else if (flag === 'trending') {
    conditions.push('is_trending = 1');
  } else if (flag === 'bestseller') {
    conditions.push('is_bestseller = 1');
  } else if (flag === 'new') {
    conditions.push('is_new = 1');
  } else if (flag === 'recommended') {
    conditions.push('is_recommended = 1');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sorting
  let orderBy = 'reviews_count DESC, rating DESC';
  if (sort === 'price-low') {
    orderBy = 'price ASC';
  } else if (sort === 'price-high') {
    orderBy = 'price DESC';
  } else if (sort === 'rating') {
    orderBy = 'rating DESC, reviews_count DESC';
  } else if (sort === 'newest') {
    orderBy = 'is_new DESC, created_at DESC';
  }

  // Count total matching
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM products ${whereClause}`).get(...params);
  const total = countRow ? countRow.count : 0;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 24));
  const offset = (parsedPage - 1) * parsedLimit;

  const rows = db.prepare(`
    SELECT * FROM products
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, parsedLimit, offset);

  return res.json({
    data: {
      products: rows.map(formatProduct),
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    },
    error: null
  });
});

// GET /api/products/search?q=
router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json({
      data: { results: [] },
      error: null
    });
  }

  const searchTerm = `%${query.toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT id, name, brand, category, price, original_price, image, rating
    FROM products
    WHERE LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ?
    ORDER BY 
      CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END,
      reviews_count DESC
    LIMIT 6
  `).all(searchTerm, searchTerm, searchTerm, `${query.toLowerCase()}%`);

  return res.json({
    data: {
      results: rows.map(r => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        category: r.category,
        price: r.price,
        originalPrice: r.original_price,
        image: r.image,
        rating: r.rating
      }))
    },
    error: null
  });
});

// GET /api/products/categories
router.get('/categories', (req, res) => {
  const rows = db.prepare(`
    SELECT category as id, COUNT(*) as count
    FROM products
    GROUP BY category
    ORDER BY count DESC
  `).all();

  return res.json({
    data: { categories: rows },
    error: null
  });
});

// GET /api/products/brands
router.get('/brands', (req, res) => {
  const rows = db.prepare(`
    SELECT brand, COUNT(*) as count
    FROM products
    GROUP BY brand
    ORDER BY count DESC
  `).all();

  return res.json({
    data: { brands: rows },
    error: null
  });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({
      data: null,
      error: 'Product not found'
    });
  }

  return res.json({
    data: {
      product: formatProduct(row)
    },
    error: null
  });
});

export default router;
