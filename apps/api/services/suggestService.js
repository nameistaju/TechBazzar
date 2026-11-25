// server/services/suggestService.js
// Advanced multi-token suggestion engine with synonym expansion, relevance scoring,
// mode-specific pricing, and privacy gating.

import db from '../db/index.js';

const SYNONYM_MAP = {
  'earbud': ['earbud', 'earbuds', 'earphone', 'earphones', 'tws', 'airdrop', 'airdopes', 'buds', 'in-ear', 'inear'],
  'earbuds': ['earbud', 'earbuds', 'earphone', 'earphones', 'tws', 'airdrop', 'airdopes', 'buds', 'in-ear', 'inear'],
  'ear buds': ['earbud', 'earbuds', 'earphone', 'earphones', 'tws', 'airdrop', 'airdopes', 'buds', 'in-ear', 'inear'],
  'earphone': ['earbud', 'earbuds', 'earphone', 'earphones', 'tws', 'airdrop', 'airdopes', 'buds', 'in-ear', 'inear'],
  'earphones': ['earbud', 'earbuds', 'earphone', 'earphones', 'tws', 'airdrop', 'airdopes', 'buds', 'in-ear', 'inear'],
  'tws': ['earbud', 'earbuds', 'earphone', 'earphones', 'tws', 'airdrop', 'airdopes', 'buds', 'in-ear', 'inear'],
  'headphone': ['headphone', 'headphones', 'headset', 'over-ear', 'on-ear', 'overear', 'onear', 'wh-1000xm5', 'xm5'],
  'headphones': ['headphone', 'headphones', 'headset', 'over-ear', 'on-ear', 'overear', 'onear', 'wh-1000xm5', 'xm5'],
  'headset': ['headphone', 'headphones', 'headset', 'over-ear', 'on-ear'],
  'powerbank': ['powerbank', 'power bank', 'power banks', 'battery pack', 'portable charger', 'mag power', 'luxcell'],
  'power bank': ['powerbank', 'power bank', 'power banks', 'battery pack', 'portable charger', 'mag power', 'luxcell'],
  'battery': ['powerbank', 'power bank', 'battery pack', 'luxcell'],
  'charger': ['charger', 'chargers', 'charging', 'adapter', 'wall charger', 'fast charger'],
  'adapter': ['charger', 'chargers', 'charging', 'adapter', 'wall charger'],
  'cable': ['cable', 'cables', 'wire', 'cord', 'type c', 'type-c', 'lightning', 'usb'],
  'wire': ['cable', 'cables', 'wire', 'cord', 'type c', 'type-c', 'lightning', 'usb'],
  'smartwatch': ['smartwatch', 'smart watch', 'smartwatches', 'watch', 'fitness band', 'tracker'],
  'smart watch': ['smartwatch', 'smart watch', 'smartwatches', 'watch', 'fitness band', 'tracker'],
  'watch': ['smartwatch', 'smart watch', 'smartwatches', 'watch', 'ultra'],
  'speaker': ['speaker', 'speakers', 'soundbar', 'bluetooth speaker', 'audio'],
  'case': ['case', 'cover', 'covers', 'protective case', 'back cover', 'phone case'],
  'cover': ['case', 'cover', 'covers', 'protective case', 'back cover', 'phone case'],
  'stand': ['stand', 'holder', 'mount', 'car mount', 'desk stand', 'modesk']
};

export function searchSuggestions(queryStr, mode = 'retail', user = null, limit = 50) {
  if (!queryStr || queryStr.trim().length === 0) {
    return { suggestions: [], total: 0 };
  }

  const rawQuery = queryStr.trim();
  const query = rawQuery.toLowerCase();
  const cleanQuery = query.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  const compactQuery = cleanQuery.replace(/[\s-]/g, '');
  const words = cleanQuery.split(' ').filter(w => w.length > 0);

  // Expand synonyms
  const synonymTerms = new Set();
  for (const [key, list] of Object.entries(SYNONYM_MAP)) {
    if (cleanQuery.includes(key) || compactQuery.includes(key.replace(/\s/g, ''))) {
      list.forEach(t => synonymTerms.add(t));
    }
  }
  for (const w of words) {
    if (SYNONYM_MAP[w]) {
      SYNONYM_MAP[w].forEach(t => synonymTerms.add(t));
    }
  }

  // Base SQL: exclude archived/merged products
  let sql = 'SELECT * FROM products WHERE deleted_at IS NULL';
  if (mode === 'wholesale') {
    sql += ' AND (is_wholesale_available IS NULL OR is_wholesale_available = 1)';
  } else if (mode === 'retail') {
    sql += ' AND (is_retail_available IS NULL OR is_retail_available = 1)';
  }

  const products = db.prepare(sql).all();

  // Check buyer wholesale permission for privacy gate
  const buyerType = user?.buyer_type || user?.buyerType;
  const wholesaleStatus = user?.wholesale_status || user?.wholesaleStatus;
  const isApprovedWholesale = user && (user.role === 'admin' || (buyerType === 'wholesale' && wholesaleStatus === 'approved'));

  const scored = [];

  for (const p of products) {
    const pSku = (p.sku || '').toLowerCase();
    const pName = (p.name || '').toLowerCase();
    const pBrand = (p.brand || '').toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    const pTags = (typeof p.tags === 'string' ? p.tags.toLowerCase() : JSON.stringify(p.tags || '')).toLowerCase();

    let score = 0;

    // 1. Exact SKU
    if (pSku === cleanQuery || pSku === query) score += 1000;
    else if (pSku.startsWith(cleanQuery)) score += 800;
    else if (pSku.includes(cleanQuery)) score += 700;

    // 2. Name matches
    if (pName === cleanQuery) score += 600;
    else if (pName.startsWith(cleanQuery)) score += 550;
    else if (words.every(w => pName.includes(w))) score += 500;
    else if (pName.includes(compactQuery)) score += 480;

    // 3. Brand
    if (pBrand === cleanQuery) score += 450;
    else if (pBrand.startsWith(cleanQuery)) score += 400;
    else if (words.some(w => pBrand.includes(w))) score += 300;

    // 4. Category
    if (pCat === cleanQuery || pCat === compactQuery) score += 380;
    else if (pCat.includes(compactQuery)) score += 350;

    // 5. Synonyms
    for (const syn of synonymTerms) {
      if (pName.includes(syn) || pCat.includes(syn) || pTags.includes(syn)) {
        score += 320;
        break;
      }
    }

    // 6. Partial words match
    for (const w of words) {
      if (w.length >= 3 && (pName.includes(w) || pTags.includes(w))) {
        score += 150;
      }
    }

    // 7. Small typo tolerance (Levenshtein distance <= 2 for words >= 4 chars)
    if (score === 0 && words.length === 1 && words[0].length >= 4) {
      const searchWord = words[0];
      const pWords = pName.split(/[\s-]+/);
      for (const pw of pWords) {
        if (pw.length >= 4 && isSimilar(searchWord, pw)) {
          score += 200;
          break;
        }
      }
    }

    if (score > 0) {
      const stock = Number(p.stock || 0);
      let stockStatus = 'in_stock';
      if (stock <= 0) stockStatus = 'out_of_stock';
      else if (stock <= 3) stockStatus = 'low_stock';

      const basePrice = Number(p.price || 0);
      const mrp = Number(p.mrp || p.original_price || Math.round(basePrice * 1.35));
      const moq = Number(p.moq || 10);
      const packSize = Number(p.pack_size || 5);
      const stepQuantity = Number(p.step_quantity || packSize);

      let unitPrice = basePrice;
      let priceTierLabel = 'Retail Price';

      if (mode === 'wholesale') {
        if (isApprovedWholesale) {
          unitPrice = Number(p.tier1_price || basePrice);
          priceTierLabel = 'Tier 1 Wholesale';
        } else {
          unitPrice = basePrice;
          priceTierLabel = 'Retail (Wholesale requires approval)';
        }
      }

      scored.push({
        id: p.id,
        name: p.name,
        brand: p.brand || 'TechBazaar',
        sku: p.sku || p.id,
        category: p.category,
        image: p.image,
        stock,
        stockStatus,
        moq,
        packSize,
        stepQuantity,
        price: unitPrice,
        priceTierLabel,
        originalPrice: p.original_price || mrp,
        mrp,
        isWholesaleAvailable: Boolean(p.is_wholesale_available ?? true),
        isRetailAvailable: Boolean(p.is_retail_available ?? true),
        wholesaleRestricted: mode === 'wholesale' && !isApprovedWholesale,
        score
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || b.stock - a.stock);
  const total = scored.length;
  const suggestions = scored.slice(0, Math.min(100, Math.max(1, limit)));

  return { suggestions, total };
}

// Simple Levenshtein distance helper for small typo tolerance
function isSimilar(s1, s2) {
  if (Math.abs(s1.length - s2.length) > 2) return false;
  let diff = 0;
  let i = 0, j = 0;
  while (i < s1.length && j < s2.length) {
    if (s1[i] !== s2[j]) {
      diff++;
      if (diff > 2) return false;
      if (s1.length > s2.length) i++;
      else if (s2.length > s1.length) j++;
      else { i++; j++; }
    } else {
      i++;
      j++;
    }
  }
  return true;
}
