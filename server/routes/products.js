import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { checkDuplicateName } from '../services/dedupService.js';
import { searchSuggestions } from '../services/suggestService.js';

const router = Router();

const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { data: null, error: 'Too many search requests. Please slow down.' }
});

// Helper to get wholesale visibility settings
function getWholesaleVisibility() {
  try {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('wholesale_show_teaser_prices', 'wholesale_prices_only_registered')").all();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const showTeaser = map.wholesale_show_teaser_prices !== 'false' && map.wholesale_prices_only_registered !== '1';
    return { showTeaser };
  } catch {
    return { showTeaser: true };
  }
}

// Helper to format product row from DB with wholesale privacy gate
export function formatProduct(row, user = null, teaserEnabled = null) {
  if (!row) return null;
  if (teaserEnabled === null) {
    teaserEnabled = getWholesaleVisibility().showTeaser;
  }
  const basePrice = Number(row.price || 0);
  const moq = Number(row.moq || 10);
  const packSize = Number(row.pack_size || 5);
  const t1Price = Number(row.tier1_price || basePrice);
  const t2Price = Number(row.tier2_price || Math.round(basePrice * 0.9));
  const t3Price = Number(row.tier3_price || Math.round(basePrice * 0.8));
  const t4Price = row.tier4_price ? Number(row.tier4_price) : null;
  const mrp = Number(row.mrp || row.original_price || Math.round(basePrice * 1.35));

  const buyerType = user?.buyer_type || user?.buyerType;
  const wholesaleStatus = user?.wholesale_status || user?.wholesaleStatus;
  const isApprovedWholesale = user && (user.role === 'admin' || (buyerType === 'wholesale' && wholesaleStatus === 'approved'));

  const base = {
    id: row.id,
    sku: row.sku || `TB-${(row.category || 'GEN').slice(0, 3).toUpperCase()}-0001`,
    name: row.name,
    brand: row.brand,
    category: row.category,
    price: basePrice,
    originalPrice: row.original_price || mrp,
    mrp: mrp,
    suggestedRetailPrice: row.suggested_retail_price || mrp,
    isRetailAvailable: row.is_retail_available !== undefined ? Boolean(row.is_retail_available) : true,
    isWholesaleAvailable: row.is_wholesale_available !== undefined ? Boolean(row.is_wholesale_available) : true,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    image: row.image,
    images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [row.image],
    stock: row.stock,
    isFlashSale: Boolean(row.is_flash_sale),
    isTrending: Boolean(row.is_trending),
    isBestseller: Boolean(row.is_bestseller),
    isNew: Boolean(row.is_new),
    isRecommended: Boolean(row.is_recommended),
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
    specs: row.specs ? (typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs) : {},
    shortDescription: row.short_description || ''
  };

  if (isApprovedWholesale) {
    base.moq = moq;
    base.packSize = packSize;
    base.stepQuantity = row.step_quantity || 1;
    base.tier1Qty = Number(row.tier1_qty || moq);
    base.tier1Price = t1Price;
    base.tier2Qty = Number(row.tier2_qty || 50);
    base.tier2Price = t2Price;
    base.tier3Qty = Number(row.tier3_qty || 100);
    base.tier3Price = t3Price;
    if (t4Price) {
      base.tier4Qty = Number(row.tier4_qty || 250);
      base.tier4Price = t4Price;
    }
    base.gstRate = row.gst_rate !== undefined ? Number(row.gst_rate) : 18;
    base.isTaxInclusive = row.is_tax_inclusive !== undefined ? Boolean(row.is_tax_inclusive) : true;
    if (user.role === 'admin') {
      base.costPrice = row.cost_price || Math.round(basePrice * 0.65);
    }
  } else if (teaserEnabled) {
    base.moq = moq;
    base.wholesaleTeaserPrice = t3Price || Math.round(basePrice * 0.8);
    base.wholesaleTeaserText = `Wholesale price from ₹${(t3Price || Math.round(basePrice * 0.8)).toLocaleString('en-IN')} (available after approval)`;
  }

  return base;
}

// GET /api/products
router.get('/', optionalAuth, (req, res) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    minMoq,
    maxMoq,
    rating,
    inStock,
    sort = 'popularity',
    page = 1,
    limit = 24,
    flag
  } = req.query;

  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (category) {
    conditions.push('LOWER(category) = LOWER(?)');
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

  if (minMoq) {
    conditions.push('moq >= ?');
    params.push(Number(minMoq));
  }

  if (maxMoq) {
    conditions.push('moq <= ?');
    params.push(Number(maxMoq));
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
      products: rows.map(r => formatProduct(r, req.user)),
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    },
    error: null
  });
});

// GET /api/products/suggest?q=&mode=&limit=30
router.get('/suggest', suggestLimiter, optionalAuth, (req, res) => {
  const { q = '', mode = 'retail', limit = 30 } = req.query;
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const result = searchSuggestions(q, mode, req.user, parsedLimit);
  return res.json({
    data: {
      suggestions: result.suggestions,
      total: result.total,
      query: q,
      mode
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
    WHERE (LOWER(name) LIKE ? OR LOWER(brand) LIKE ? OR LOWER(category) LIKE ?)
      AND deleted_at IS NULL
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
    SELECT LOWER(category) as id, COUNT(*) as count
    FROM products
    WHERE deleted_at IS NULL
    GROUP BY LOWER(category)
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
    WHERE deleted_at IS NULL
    GROUP BY brand
    ORDER BY count DESC
  `).all();

  return res.json({
    data: { brands: rows },
    error: null
  });
});

// GET /api/products/check-duplicate?name=&brand=&excludeId=
router.get('/check-duplicate', (req, res) => {
  const { name, brand, excludeId } = req.query;
  const result = checkDuplicateName(name, brand, excludeId);
  return res.json({
    data: result,
    error: null
  });
});

// GET /api/products/:id
router.get('/:id', optionalAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({
      data: null,
      error: 'Product not found'
    });
  }

  // Check if product was merged into a canonical product
  if (row.deleted_at && row.merged_into) {
    const canonical = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(row.merged_into);
    if (canonical) {
      return res.json({
        data: {
          product: formatProduct(canonical, req.user),
          redirectedFrom: row.id,
          canonicalId: canonical.id,
          redirectUrl: `/product/${canonical.id}`
        },
        error: null
      });
    }
  }

  if (row.deleted_at) {
    return res.status(404).json({
      data: null,
      error: 'Product not found'
    });
  }

  return res.json({
    data: {
      product: formatProduct(row, req.user)
    },
    error: null
  });
});

export default router;
