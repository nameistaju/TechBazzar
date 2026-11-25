// server/services/dedupService.js
// Dedicated service for Product Deduplication, Canonical Grouping,
// Reference Remapping, Variant Consolidation, and Safe Undo.

import db from '../../../../db/index.js';

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

/**
 * Scan database for candidate duplicate groups.
 */
export function findDuplicateGroups() {
  const products = db.prepare(`
    SELECT id, sku, name, brand, category, price, original_price, mrp, stock,
           image, images, variants, specs, short_description, created_at, status
    FROM products
    WHERE deleted_at IS NULL
    ORDER BY id ASC
  `).all();

  // Known manual exact canonical overrides for ambiguous seed artifacts:
  const getGroupKey = (p) => {
    const brand = (p.brand || 'TechBazaar').toLowerCase().trim();
    const name = (p.name || '').toLowerCase();

    if (name.includes('wh-1000xm5') || name.includes('wh 1000xm5')) {
      return 'sony:::wh-1000xm5';
    }
    if (brand.includes('apple') && name.includes('watch ultra') && name.includes('titanium')) {
      return 'apple:::watch-ultra-titanium';
    }
    if (brand.includes('portronics') && (name.includes('power mag') || (name.includes('luxcell') && name.includes('magnetic wireless')))) {
      return 'portronics:::power-mag-15w';
    }
    if (brand.includes('portronics') && name.includes('clamp m')) {
      return 'portronics:::clamp-m';
    }
    if (brand.includes('portronics') && name.includes('modesk 360') && !name.includes('gimbal') && !name.includes('ai auto')) {
      return 'portronics:::modesk-360-stand';
    }
    if (brand.includes('triggr') && name.includes('gaming earbuds') && !name.includes('kraken')) {
      return 'triggr:::tws-gaming-earbuds';
    }

    const normModel = computeNormalizedName(p.name, p.brand);
    return `${brand}:::${p.category}:::${normModel}`;
  };

  const groupsMap = {};
  for (const p of products) {
    const key = getGroupKey(p);
    if (!groupsMap[key]) {
      groupsMap[key] = {
        key,
        brand: p.brand || 'TechBazaar',
        category: p.category,
        products: []
      };
    }
    groupsMap[key].products.push(p);
  }

  // Filter to only groups with 2 or more products
  const duplicates = Object.values(groupsMap).filter(g => g.products.length > 1);

  return duplicates.map((g, idx) => {
    // Choose canonical: product with most reviews/orders, or non-image prefix, or lowest ID
    const sorted = [...g.products].sort((a, b) => {
      // Prioritize clean slug IDs over random seed IDs (e.g. apple-watch-ultra over image-40-)
      const aSeed = a.id.startsWith('tb-prod-') || a.id.startsWith('image-') ? 1 : 0;
      const bSeed = b.id.startsWith('tb-prod-') || b.id.startsWith('image-') ? 1 : 0;
      if (aSeed !== bSeed) return aSeed - bSeed;
      return a.id.localeCompare(b.id);
    });

    const canonical = sorted[0];
    const duplicatesList = sorted.slice(1);

    return {
      groupId: `group-${idx + 1}`,
      key: g.key,
      brand: g.brand,
      category: g.category,
      canonicalId: canonical.id,
      products: sorted,
      canonical,
      duplicates: duplicatesList,
      count: sorted.length
    };
  });
}

/**
 * Execute merge of a group into a canonical product.
 */
export function mergeProductGroup(canonicalId, duplicateIds) {
  if (!canonicalId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
    throw new Error('Valid canonicalId and duplicateIds array required');
  }

  const canonical = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(canonicalId);
  if (!canonical) {
    throw new Error(`Canonical product "${canonicalId}" not found or already deleted.`);
  }

  const dupProducts = db.prepare(`
    SELECT * FROM products WHERE id IN (${duplicateIds.map(() => '?').join(',')}) AND deleted_at IS NULL
  `).all(...duplicateIds);

  if (dupProducts.length === 0) {
    return { success: true, message: 'No active duplicate products to merge.' };
  }

  // 1. Gather all unique gallery images
  let existingImages = [];
  try {
    existingImages = canonical.images ? (typeof canonical.images === 'string' ? JSON.parse(canonical.images) : canonical.images) : [];
  } catch {
    existingImages = [canonical.image];
  }
  if (!existingImages.includes(canonical.image) && canonical.image) {
    existingImages.unshift(canonical.image);
  }

  const newImages = [...existingImages];
  for (const dp of dupProducts) {
    if (dp.image && !newImages.includes(dp.image)) {
      newImages.push(dp.image);
    }
    let dpGallery = [];
    try {
      dpGallery = dp.images ? (typeof dp.images === 'string' ? JSON.parse(dp.images) : dp.images) : [];
    } catch {}
    for (const img of dpGallery) {
      if (img && !newImages.includes(img)) {
        newImages.push(img);
      }
    }
  }

  // 2. Build / consolidate variants if distinct color or models
  let existingVariants = [];
  try {
    existingVariants = canonical.variants ? (typeof canonical.variants === 'string' ? JSON.parse(canonical.variants) : canonical.variants) : [];
  } catch {
    existingVariants = [];
  }

  const consolidatedVariants = [...existingVariants];

  // Helper to extract color or differentiator from title
  const extractVariantName = (name) => {
    for (const c of COLOR_WORDS) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(name)) {
        return c.charAt(0).toUpperCase() + c.slice(1);
      }
    }
    return null;
  };

  for (const dp of dupProducts) {
    const varName = extractVariantName(dp.name);
    if (varName && !consolidatedVariants.some(v => v.name.toLowerCase() === varName.toLowerCase())) {
      consolidatedVariants.push({
        id: `var-${dp.id}`,
        name: varName,
        sku: dp.sku || `${canonical.sku}-${varName.slice(0, 3).toUpperCase()}`,
        price: dp.price || canonical.price,
        stock: dp.stock || canonical.stock,
        image: dp.image || canonical.image
      });
    }
  }

  // 3. Perform atomic database updates
  const previousState = {
    canonicalId,
    canonicalImages: canonical.images,
    canonicalVariants: canonical.variants,
    mergedProductIds: dupProducts.map(p => p.id),
    mergedProductRows: dupProducts
  };

  db.transaction(() => {
    // A. Update canonical product's gallery & variants
    db.prepare(`
      UPDATE products 
      SET images = ?, variants = ?
      WHERE id = ?
    `).run(
      JSON.stringify(newImages),
      consolidatedVariants.length > 0 ? JSON.stringify(consolidatedVariants) : canonical.variants,
      canonicalId
    );

    // B. Soft-delete merged products and link to canonical
    const softDeleteStmt = db.prepare(`
      UPDATE products 
      SET deleted_at = CURRENT_TIMESTAMP, merged_into = ?, status = 'archived'
      WHERE id = ?
    `);

    for (const dp of dupProducts) {
      softDeleteStmt.run(canonicalId, dp.id);
    }

    // C. Remap all references in cart_items (avoiding duplicate user_id + product_id unique constraint)
    for (const dp of dupProducts) {
      const existingCart = db.prepare('SELECT id, quantity FROM cart_items WHERE product_id = ?').all(dp.id);
      for (const ec of existingCart) {
        const canonicalCart = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(ec.user_id, canonicalId);
        if (canonicalCart) {
          db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(ec.quantity, canonicalCart.id);
          db.prepare('DELETE FROM cart_items WHERE id = ?').run(ec.id);
        } else {
          db.prepare('UPDATE cart_items SET product_id = ? WHERE id = ?').run(canonicalId, ec.id);
        }
      }

      // Wholesale cart items
      const existingWsCart = db.prepare('SELECT id, quantity FROM wholesale_cart_items WHERE product_id = ?').all(dp.id);
      for (const ewc of existingWsCart) {
        const canonicalWs = db.prepare('SELECT id, quantity FROM wholesale_cart_items WHERE user_id = ? AND product_id = ?').get(ewc.user_id, canonicalId);
        if (canonicalWs) {
          db.prepare('UPDATE wholesale_cart_items SET quantity = quantity + ? WHERE id = ?').run(ewc.quantity, canonicalWs.id);
          db.prepare('DELETE FROM wholesale_cart_items WHERE id = ?').run(ewc.id);
        } else {
          db.prepare('UPDATE wholesale_cart_items SET product_id = ? WHERE id = ?').run(canonicalId, ewc.id);
        }
      }

      // Wishlist
      const wishlists = db.prepare('SELECT id, user_id FROM wishlist_items WHERE product_id = ?').all(dp.id);
      for (const w of wishlists) {
        const exists = db.prepare('SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?').get(w.user_id, canonicalId);
        if (exists) {
          db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(w.id);
        } else {
          db.prepare('UPDATE wishlist_items SET product_id = ? WHERE id = ?').run(canonicalId, w.id);
        }
      }

      // Notify requests
      db.prepare('UPDATE notify_requests SET product_id = ? WHERE product_id = ?').run(canonicalId, dp.id);

      // Price lists
      db.prepare('UPDATE price_lists SET product_id = ? WHERE product_id = ?').run(canonicalId, dp.id);

      // Stock movements
      db.prepare('UPDATE stock_movements SET product_id = ? WHERE product_id = ?').run(canonicalId, dp.id);

      // Order items, estimate items, invoice items (snapshots preserved, product_id pointed to canonical)
      db.prepare('UPDATE order_items SET product_id = ? WHERE product_id = ?').run(canonicalId, dp.id);
      db.prepare('UPDATE estimate_items SET product_id = ? WHERE product_id = ?').run(canonicalId, dp.id);
      db.prepare('UPDATE invoice_items SET product_id = ? WHERE product_id = ?').run(canonicalId, dp.id);
    }

    // D. Remap banners with links to merged product
    for (const dp of dupProducts) {
      db.prepare(`
        UPDATE banners
        SET link_target = ?
        WHERE link_target = ? OR link_target = ?
      `).run(`/product/${canonicalId}`, `/product/${dp.id}`, dp.id);
    }

    // E. Remap discounts with scope_values
    const discountsWithProducts = db.prepare("SELECT id, scope_values FROM discounts WHERE scope = 'products' AND scope_values IS NOT NULL").all();
    for (const d of discountsWithProducts) {
      try {
        let values = typeof d.scope_values === 'string' ? JSON.parse(d.scope_values) : d.scope_values;
        if (Array.isArray(values)) {
          let touched = false;
          const updated = values.map(v => {
            if (duplicateIds.includes(v)) {
              touched = true;
              return canonicalId;
            }
            return v;
          });
          if (touched) {
            const dedupedValues = [...new Set(updated)];
            db.prepare('UPDATE discounts SET scope_values = ? WHERE id = ?').run(JSON.stringify(dedupedValues), d.id);
          }
        }
      } catch {}
    }

    // F. Record in activity log
    db.prepare(`
      INSERT INTO activity_log (action, entity_type, entity_id, details, before_state, after_state, undoable, undone)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    `).run(
      'merge_products',
      'product',
      canonicalId,
      `Merged ${dupProducts.length} duplicate product(s) into "${canonical.name}" (${canonical.sku})`,
      JSON.stringify(previousState),
      JSON.stringify({ canonicalId, mergedProductIds: dupProducts.map(p => p.id), galleryCount: newImages.length })
    );
  })();

  return {
    success: true,
    canonicalId,
    mergedCount: dupProducts.length,
    galleryImagesCount: newImages.length,
    variantsCount: consolidatedVariants.length,
    message: `Successfully merged ${dupProducts.length} duplicate(s) into canonical product "${canonical.name}".`
  };
}

/**
 * Undo a previously executed merge from the activity log.
 */
export function undoMerge(activityLogId) {
  const log = db.prepare("SELECT * FROM activity_log WHERE id = ? AND action = 'merge_products'").get(activityLogId);
  if (!log) {
    throw new Error('Merge activity log entry not found.');
  }
  if (log.undone) {
    throw new Error('This merge has already been undone.');
  }

  const before = log.before_state ? JSON.parse(log.before_state) : null;
  if (!before || !before.canonicalId || !before.mergedProductIds) {
    throw new Error('Invalid snapshot data for merge undo.');
  }

  db.transaction(() => {
    // 1. Restore canonical product's previous images and variants
    db.prepare(`
      UPDATE products 
      SET images = ?, variants = ?
      WHERE id = ?
    `).run(before.canonicalImages, before.canonicalVariants, before.canonicalId);

    // 2. Un-soft-delete merged products
    const restoreStmt = db.prepare(`
      UPDATE products 
      SET deleted_at = NULL, merged_into = NULL, status = 'active'
      WHERE id = ?
    `);

    for (const id of before.mergedProductIds) {
      restoreStmt.run(id);
    }

    // 3. Mark log entry as undone
    db.prepare('UPDATE activity_log SET undone = 1 WHERE id = ?').run(activityLogId);

    // 4. Record undo action
    db.prepare(`
      INSERT INTO activity_log (action, entity_type, entity_id, details, before_state, after_state, undoable, undone)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `).run(
      'undo',
      'product',
      before.canonicalId,
      `Undid merge of ${before.mergedProductIds.length} product(s) into ${before.canonicalId}`,
      null,
      null
    );
  })();

  return {
    success: true,
    restoredCount: before.mergedProductIds.length,
    canonicalId: before.canonicalId,
    message: `Successfully restored ${before.mergedProductIds.length} merged product(s).`
  };
}

/**
 * Soft uniqueness and similarity check for product creation / typing.
 */
export function checkDuplicateName(name, brand, excludeId = null) {
  if (!name || name.trim().length < 3) return { exists: false, matches: [] };

  const norm = computeNormalizedName(name, brand);
  const targetBrand = (brand || '').trim().toLowerCase();

  let query = `
    SELECT id, name, brand, sku, price, stock, image
    FROM products
    WHERE deleted_at IS NULL
  `;
  const params = [];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  const products = db.prepare(query).all(...params);
  const matches = [];

  for (const p of products) {
    const pBrand = (p.brand || '').trim().toLowerCase();
    const pNorm = p.normalized_name || computeNormalizedName(p.name, p.brand);

    // Exact normalized match within same brand
    if (targetBrand && pBrand === targetBrand && pNorm === norm) {
      matches.push({
        ...p,
        similarity: 100,
        reason: 'Identical brand and model name'
      });
      continue;
    }

    // High similarity check
    if ((!targetBrand || pBrand === targetBrand) && pNorm && norm) {
      if (pNorm.includes(norm) || norm.includes(pNorm)) {
        matches.push({
          ...p,
          similarity: 90,
          reason: 'Brand matches and model title is a direct subset'
        });
      }
    }
  }

  return {
    exists: matches.length > 0,
    matches: matches.slice(0, 5)
  };
}
