// server/routes/branding.js
// Dynamic Branding & Accent Color Engine
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateImageUpload } from '../utils/imageSecurity.js';

const router = Router();

// ==========================================
// COLOR MATH & ACCESSIBILITY HELPERS
// ==========================================

export function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Relative luminance per WCAG 2.1
export function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Contrast ratio per WCAG 2.1 (returns e.g. 4.5 for 4.5:1)
export function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

// Derive hover (darker), pressed, tint (10% on white), border tint, focus ring, contrast text
export function deriveColorTokens(hex) {
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
  const rgb = hexToRgb(cleanHex);

  // Darker for hover (-12%) and pressed (-22%)
  const hoverHex = rgbToHex(rgb.r * 0.88, rgb.g * 0.88, rgb.b * 0.88);
  const pressedHex = rgbToHex(rgb.r * 0.78, rgb.g * 0.78, rgb.b * 0.78);

  // 10% tint on white
  const tintHex = rgbToHex(rgb.r * 0.1 + 255 * 0.9, rgb.g * 0.1 + 255 * 0.9, rgb.b * 0.1 + 255 * 0.9);
  // 25% tint for soft borders
  const borderHex = rgbToHex(rgb.r * 0.25 + 255 * 0.75, rgb.g * 0.25 + 255 * 0.75, rgb.b * 0.25 + 255 * 0.75);

  // Focus ring with 35% opacity
  const ringRgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

  // Contrast text: choose white (#FFFFFF) vs near-black (#0A0A0A)
  const contrastWithWhite = getContrastRatio(cleanHex, '#FFFFFF');
  const contrastWithBlack = getContrastRatio(cleanHex, '#0A0A0A');
  const textContrast = contrastWithWhite >= 3.0 ? '#FFFFFF' : '#0A0A0A';

  // AA pass check: normal text requires 4.5:1, large/UI components require 3:1
  const aaTextPass = Math.max(contrastWithWhite, contrastWithBlack) >= 4.5;
  const aaUiPass = contrastWithWhite >= 3.0 || contrastWithBlack >= 3.0;

  return {
    accent_hex: cleanHex,
    accent_hover: hoverHex,
    accent_pressed: pressedHex,
    accent_tint: tintHex,
    accent_border: borderHex,
    accent_ring: ringRgba,
    accent_contrast: textContrast,
    contrast_ratio_white: contrastWithWhite,
    contrast_ratio_black: contrastWithBlack,
    aa_pass: aaTextPass,
    aa_ui_pass: aaUiPass
  };
}

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
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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

  // Validate hex if provided
  let accentHex = body.accent_hex ? body.accent_hex.trim() : beforeState.accent_hex;
  if (!/^#([0-9A-F]{3}){1,2}$/i.test(accentHex)) {
    accentHex = '#FF4D00';
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

    const uploadDir = path.resolve('public/uploads/brand');
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
        fs.writeFileSync(path.resolve('public/favicon.png'), check.buffer);
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
