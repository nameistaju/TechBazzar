import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { validateBody } from '../../../core/middleware/validate.js';
import * as adminSchemas from '../schemas.js';
import { findDuplicateGroups, mergeProductGroup } from './dedupService.js';

const router = Router();

// ==========================================
// 3. PRODUCTS MANAGEMENT
// ==========================================

// GET /api/admin/products/images (Scan /public/images for visual picker)
router.get('/products/images', (req, res) => {
  const imagesDir = path.resolve('public/images');
  try {
    const files = fs.readdirSync(imagesDir);
    const validImages = files
      .filter(f => /\.(jpe?g|png|webp|svg)$/i.test(f) && !f.endsWith('.woff2'))
      .map(f => ({
        filename: f,
        path: `/images/${f}`,
        name: f.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      }));

    return res.json({ data: { images: validImages }, error: null });
  } catch {
    return res.status(500).json({ data: null, error: 'Could not load local images directory.' });
  }
});

// GET /api/admin/products/duplicates
router.get('/products/duplicates', (req, res) => {
  try {
    const groups = findDuplicateGroups();
    return res.json({
      data: {
        groups,
        totalGroups: groups.length,
        totalDuplicates: groups.reduce((acc, g) => acc + (g.duplicates ? g.duplicates.length : 0), 0)
      },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// POST /api/admin/products/merge
router.post('/products/merge', validateBody(adminSchemas.mergeProductsSchema), (req, res) => {
  const { canonicalId, duplicateIds } = req.body;
  if (!canonicalId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
    return res.status(400).json({ data: null, error: 'canonicalId and duplicateIds array are required.' });
  }

  try {
    const result = mergeProductGroup(canonicalId, duplicateIds);
    return res.json({ data: result, error: null });
  } catch (err) {
    return res.status(400).json({ data: null, error: err.message });
  }
});

// POST /api/admin/products/merge-all
router.post('/products/merge-all', (req, res) => {
  try {
    const groups = findDuplicateGroups();
    const results = [];
    let mergedTotal = 0;

    for (const g of groups) {
      if (g.canonicalId && g.duplicates?.length > 0) {
        const dupIds = g.duplicates.map(d => d.id);
        const res = mergeProductGroup(g.canonicalId, dupIds);
        results.push(res);
        mergedTotal += dupIds.length;
      }
    }

    return res.json({
      data: {
        mergedGroupsCount: results.length,
        mergedProductsCount: mergedTotal,
        results
      },
      error: null
    });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// GET /api/admin/products

export default router;
