// server/routes/branding.js
// Dynamic Branding & Accent Color Engine
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from '../../../db/index.js';
import { UPLOADS_DIR, WEB_PUBLIC_DIR } from '../../../config/paths.js';
import { requireAdmin } from '../../core/middleware/auth.js';
import { validateImageUpload } from '../../core/utils/imageSecurity.js';
import {
  hexToRgb,
  rgbToHex,
  getRelativeLuminance as getLuminance,
  getContrastRatio,
  deriveColorTokens,
  parseHex
} from '../../../../web/src/shared/utils/colorContrast.js';

export { hexToRgb, rgbToHex, getLuminance, getContrastRatio, deriveColorTokens };

const router = Router();

// Default system branding values
export const DEFAULT_BRANDING = {
  brand_name: 'TechBazaar',
  brand_name_part1: 'TECH',
  brand_name_part2: 'BAZAAR',
  use_split_name: 'true',
  use_text_wordmark: 'false',
  tagline: 'Curated Electronics & Modern Gadgets',
  logo_mark: '/favicon.png',
  logo_wordmark: '/logo.png',
  logo_dark: '/logo.png',
  favicon: '/favicon.png',
  accent_hex: '#FF4D00',
  footer_dark_hex: '#0A0A0A'
};

export function getBrandingData() {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'branding_%' OR key = 'business_trade_name'").all();
  const map = {};
  for (const r of rows) {
    const cleanKey = r.key.replace(/^branding_/, '');
    map[cleanKey] = r.value;
  }

  const brandName = map.brand_name || map.business_trade_name || DEFAULT_BRANDING.brand_name;
  const accentHex = map.accent_hex || DEFAULT_BRANDING.accent_hex;
  const tokens = deriveColorTokens(accentHex);

  return {
    brand_name: brandName,
    brand_name_part1: map.brand_name_part1 || (brandName.length > 4 ? brandName.slice(0, 4).toUpperCase() : brandName.toUpperCase()),
    brand_name_part2: map.brand_name_part2 || (brandName.length > 4 ? brandName.slice(4).toUpperCase() : ''),
    use_split_name: map.use_split_name !== undefined ? map.use_split_name === 'true' : true,
    use_text_wordmark: map.use_text_wordmark !== undefined ? map.use_text_wordmark === 'true' : false,
    tagline: map.tagline || DEFAULT_BRANDING.tagline,
    logo_mark: map.logo_mark || DEFAULT_BRANDING.logo_mark,
    logo_wordmark: map.logo_wordmark || DEFAULT_BRANDING.logo_wordmark,
    logo_dark: map.logo_dark || DEFAULT_BRANDING.logo_dark,
    favicon: map.favicon || DEFAULT_BRANDING.favicon,
    footer_dark_hex: map.footer_dark_hex || DEFAULT_BRANDING.footer_dark_hex,
    ...tokens
  };
}

// ==========================================
// 1. PUBLIC ENDPOINT: GET /api/branding
// ==========================================
router.get('/branding', (req, res) => {
  try {
    const branding = getBrandingData();
    const etag = `W/"${crypto.createHash('md5').update(JSON.stringify(branding)).digest('hex')}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache');
    return res.json({ data: branding, error: null });
  } catch (err) {
    console.error('Failed to load branding:', err);
    return res.status(500).json({ data: null, error: 'Failed to load store branding' });
  }
});

// ==========================================
// 2. ADMIN ENDPOINTS (Require Admin)
// ==========================================

// PUT /api/admin/branding
router.put('/admin/branding', requireAdmin, (req, res) => {
  const body = req.body;
  if (!body) {
    return res.status(400).json({ data: null, error: 'No branding data provided' });
  }

  const beforeState = getBrandingData();

  // Validate hex if provided (accepts 3 or 6 digits, with or without #)
  let accentHex = beforeState.accent_hex;
  if (body.accent_hex !== undefined && String(body.accent_hex).trim() !== '') {
    const parsed = parseHex(String(body.accent_hex));
    if (!parsed.valid) {
      return res.status(400).json({ data: null, error: parsed.error });
    }
    accentHex = parsed.hex;
  }

  const upsert = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.transaction(() => {
    if (body.brand_name) {
      upsert.run('branding_brand_name', body.brand_name.trim());
      upsert.run('business_trade_name', body.brand_name.trim());
    }
    if (body.brand_name_part1 !== undefined) upsert.run('branding_brand_name_part1', String(body.brand_name_part1));
    if (body.brand_name_part2 !== undefined) upsert.run('branding_brand_name_part2', String(body.brand_name_part2));
    if (body.use_split_name !== undefined) upsert.run('branding_use_split_name', String(body.use_split_name));
    if (body.use_text_wordmark !== undefined) upsert.run('branding_use_text_wordmark', String(body.use_text_wordmark));
    if (body.tagline !== undefined) upsert.run('branding_tagline', String(body.tagline));
    if (body.logo_mark) upsert.run('branding_logo_mark', String(body.logo_mark));
    if (body.logo_wordmark) upsert.run('branding_logo_wordmark', String(body.logo_wordmark));
    if (body.logo_dark) upsert.run('branding_logo_dark', String(body.logo_dark));
    if (body.favicon) upsert.run('branding_favicon', String(body.favicon));
    if (body.footer_dark_hex) upsert.run('branding_footer_dark_hex', String(body.footer_dark_hex));

    upsert.run('branding_accent_hex', accentHex);
  })();

  const afterState = getBrandingData();

  // Log in activity_log (undoable)
  try {
    db.prepare(`
      INSERT INTO activity_log (action, entity_type, entity_id, details, before_state, after_state, undoable, undone)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    `).run(
      'update_branding',
      'branding',
      'theme',
      `Updated site branding and accent color to ${accentHex} for ${afterState.brand_name}`,
      JSON.stringify(beforeState),
      JSON.stringify(afterState)
    );
  } catch (err) {
    console.error('Failed to log branding activity:', err);
  }

  return res.json({ data: afterState, error: null });
});

// POST /api/admin/branding/logo (Upload logo mark / wordmark / favicon — PNG/JPEG/WebP only, magic-byte & dimension checked)
router.post('/admin/branding/logo', requireAdmin, (req, res) => {
  try {
    const { fileData, targetType = 'mark' } = req.body;
    const allowedTargets = ['mark', 'wordmark', 'dark', 'favicon'];
    const safeTarget = allowedTargets.includes(targetType) ? targetType : 'mark';

    const check = validateImageUpload(fileData, { maxBytes: 2 * 1024 * 1024, minDim: 16, maxDim: 2048 });
    if (!check.valid) {
      return res.status(400).json({ data: null, error: check.error });
    }

    const uploadDir = path.join(UPLOADS_DIR, 'brand');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `brand-${safeTarget}-${crypto.randomBytes(12).toString('hex')}.${check.ext}`;
    const targetPath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(targetPath, check.buffer);

    const publicUrl = `/uploads/brand/${uniqueName}`;

    // If target is favicon, also copy to public/favicon.png for browser direct loads
    if (safeTarget === 'favicon' && check.ext === 'png') {
      try {
        fs.writeFileSync(path.join(WEB_PUBLIC_DIR, 'favicon.png'), check.buffer);
      } catch {}
    }

    return res.json({
      data: {
        url: publicUrl,
        type: safeTarget,
        size: check.buffer.length,
        mime: check.format,
        width: check.width,
        height: check.height
      },
      error: null
    });
  } catch (err) {
    console.error('Failed to upload logo:', err);
    return res.status(500).json({ data: null, error: 'Internal server error while saving brand logo' });
  }
});

export default router;
