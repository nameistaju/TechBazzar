/**
 * Shared WCAG 2.1 Color Math & Dynamic Accent Token Helper
 * Used by both frontend (BrandingThemeTab, BrandingContext) and backend (branding routes, pdfGenerator).
 */

export function parseHex(input) {
  if (typeof input !== 'string') {
    return { valid: false, hex: null, error: 'Hex colour must be a string.' };
  }
  const stripped = input.trim().replace(/^#/, '');
  if (!/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(stripped)) {
    return {
      valid: false,
      hex: null,
      error: 'Enter a valid 3- or 6-digit hex colour (e.g. #2563EB or 2563EB).'
    };
  }
  const expanded = stripped.length === 3
    ? stripped.split('').map((ch) => ch + ch).join('')
    : stripped;
  return { valid: true, hex: `#${expanded.toUpperCase()}`, error: null };
}

export function hexToRgb(hex) {
  const parsed = parseHex(hex);
  if (!parsed.valid) {
    return { r: 255, g: 77, b: 0 };
  }
  const num = parseInt(parsed.hex.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function hexToRgbChannels(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

export function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  };
}

/**
 * WCAG 2.1 relative luminance for sRGB channels (0-255).
 */
export function getRelativeLuminance(r, g, b) {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * WCAG 2.1 contrast ratio between two hex colours (1..21).
 */
export function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Finds the nearest darker shade of the same hue that achieves >= targetRatio against white (#FFFFFF).
 */
export function findNearestAccessibleShade(hex, targetRatio = 4.5) {
  const parsed = parseHex(hex);
  if (!parsed.valid) return '#FF4D00';
  if (getContrastRatio(parsed.hex, '#FFFFFF') >= targetRatio) {
    return parsed.hex;
  }
  const { r, g, b } = hexToRgb(parsed.hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  let low = 0;
  let high = l;
  let bestHex = '#0A0A0A';

  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    const candRgb = hslToRgb(h, s, mid);
    const candHex = rgbToHex(candRgb.r, candRgb.g, candRgb.b);
    if (getContrastRatio(candHex, '#FFFFFF') >= targetRatio) {
      bestHex = candHex;
      low = mid;
    } else {
      high = mid;
    }
  }
  return bestHex;
}

/**
 * Derives all dynamic theme tokens & WCAG 2.1 contrast metrics from a single accent hex.
 */
export function deriveColorTokens(hex) {
  const parsed = parseHex(hex);
  const cleanHex = parsed.valid ? parsed.hex : '#FF4D00';
  const rgb = hexToRgb(cleanHex);

  const hoverHex = rgbToHex(rgb.r * 0.88, rgb.g * 0.88, rgb.b * 0.88);
  const pressedHex = rgbToHex(rgb.r * 0.78, rgb.g * 0.78, rgb.b * 0.78);
  const tintHex = rgbToHex(rgb.r * 0.1 + 255 * 0.9, rgb.g * 0.1 + 255 * 0.9, rgb.b * 0.1 + 255 * 0.9);
  const borderHex = rgbToHex(rgb.r * 0.25 + 255 * 0.75, rgb.g * 0.25 + 255 * 0.75, rgb.b * 0.25 + 255 * 0.75);
  const accentTextHex = findNearestAccessibleShade(cleanHex, 4.5);

  const contrastWithWhite = getContrastRatio(cleanHex, '#FFFFFF');
  const contrastWithBlack = getContrastRatio(cleanHex, '#0A0A0A');

  // Auto-pick whichever of near-black (#0A0A0A) or white (#FFFFFF) has higher contrast
  const textContrast = contrastWithBlack > contrastWithWhite ? '#0A0A0A' : '#FFFFFF';
  const labelContrastRatio = Math.max(contrastWithWhite, contrastWithBlack);

  const aaTextPass = contrastWithWhite >= 4.5;
  const aaUiPass = contrastWithWhite >= 3.0;
  const aaLabelPass = labelContrastRatio >= 4.5;

  return {
    accent_hex: cleanHex,
    accent_rgb: hexToRgbChannels(cleanHex),
    accent_hover: hoverHex,
    accent_hover_rgb: hexToRgbChannels(hoverHex),
    accent_pressed: pressedHex,
    accent_pressed_rgb: hexToRgbChannels(pressedHex),
    accent_tint: tintHex,
    accent_tint_rgb: hexToRgbChannels(tintHex),
    accent_border: borderHex,
    accent_border_rgb: hexToRgbChannels(borderHex),
    accent_text: accentTextHex,
    accent_text_rgb: hexToRgbChannels(accentTextHex),
    accent_contrast: textContrast,
    accent_contrast_rgb: hexToRgbChannels(textContrast),
    accent_ring: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
    contrast_ratio_white: contrastWithWhite,
    contrast_ratio_black: contrastWithBlack,
    label_contrast_ratio: labelContrastRatio,
    aa_text_pass: aaTextPass,
    aa_ui_pass: aaUiPass,
    aa_label_pass: aaLabelPass,
    aa_pass: aaTextPass
  };
}
