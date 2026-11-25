// server/db/generateSampleBanners.js
// Generates crisp SVG banners matching the 3:1 desktop and 4:3 mobile specifications
// Uses TechBazaar design tokens: near-black #0A0A0A, pure white, hairlines #EAEAEA, electric orange #FF4D00

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { UPLOADS_DIR } from '../../config/paths.js';

export async function generateSampleBanners() {
  const uploadDir = path.join(UPLOADS_DIR, 'banners');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const banners = [
    {
      id: 'festive-deals',
      slot: 'home-mid-1',
      badge: 'FESTIVE WHOLESALE EVENT',
      title: 'BULK ELECTRONICS BONANZA',
      subtitle: 'Flat 15% Extra Savings On Tier-3 Orders Above ₹50,000',
      action: 'USE COUPON FESTIVE25 AT CHECKOUT',
      subtext: 'Verified GST Input Tax Credit • Instant Pan-India Dispatch'
    },
    {
      id: 'smart-audio',
      slot: 'home-mid-2',
      badge: 'FACTORY DIRECT STOCK',
      title: 'ACOUSTIC HARDWARE FOR RESELLERS',
      subtitle: 'Premium Wireless Earbuds &amp; ANC Audio with 35%+ Resale Margins',
      action: 'BROWSE AUDIO CATALOGUE',
      subtext: 'Tier 1 to Tier 3 Bulk Tiers • Direct Brand Warranty Included'
    },
    {
      id: 'b2b-partner',
      slot: 'home-mid-3',
      badge: 'B2B PARTNER NETWORK',
      title: 'BECOME A REGISTERED RESELLER',
      subtitle: 'Custom Quotations, Dedicated Logistics, and Flexible Payment Terms',
      action: 'REQUEST A CUSTOM QUOTE',
      subtext: 'Over 1,200 Electronics Retailers Powered Across India'
    }
  ];

  for (const b of banners) {
    // 1. Desktop Image: 3:1 ratio (1800 x 600)
    const desktopSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 600" width="1800" height="600">
  <defs>
    <linearGradient id="bg-${b.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A0A0A" />
      <stop offset="60%" stop-color="#141414" />
      <stop offset="100%" stop-color="#1E1E1E" />
    </linearGradient>
    <pattern id="grid-${b.id}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222222" stroke-width="0.75" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1800" height="600" fill="url(#bg-${b.id})" />
  <rect width="1800" height="600" fill="url(#grid-${b.id})" opacity="0.6" />
  
  <!-- Subtle orange aura glow in top-right corner -->
  <circle cx="1600" cy="100" r="350" fill="#FF4D00" opacity="0.12" />
  <circle cx="1700" cy="500" r="250" fill="#FF4D00" opacity="0.08" />

  <!-- 1px Hairline Frame -->
  <rect x="24" y="24" width="1752" height="552" fill="none" stroke="#333333" stroke-width="1" rx="4" />

  <!-- Safe Zone Visual Accent Bar -->
  <rect x="120" y="110" width="8" height="380" fill="#FF4D00" rx="2" />

  <!-- Content (Kept within 80% Central Safe Zone) -->
  <g transform="translate(160, 0)">
    <!-- Badge -->
    <rect x="0" y="140" width="280" height="34" fill="#1C1C1C" stroke="#333333" stroke-width="1" rx="2" />
    <circle cx="20" cy="157" r="4" fill="#FF4D00" />
    <text x="36" y="162" fill="#EAEAEA" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="3" text-transform="uppercase">${b.badge}</text>

    <!-- Main Title -->
    <text x="0" y="250" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="800" letter-spacing="2" text-transform="uppercase">${b.title}</text>

    <!-- Subtitle -->
    <text x="0" y="315" fill="#BDBDBD" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" letter-spacing="0.5">${b.subtitle}</text>

    <!-- Subtext Details -->
    <text x="0" y="375" fill="#888888" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="500" letter-spacing="1" text-transform="uppercase">${b.subtext}</text>

    <!-- Action Pill Button Graphic -->
    <g transform="translate(0, 420)">
      <rect x="0" y="0" width="340" height="54" fill="#FF4D00" rx="4" />
      <text x="170" y="33" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" letter-spacing="2" text-anchor="middle" text-transform="uppercase">${b.action} →</text>
    </g>
  </g>

  <!-- Right Decorative Icon / Minimal Geometric Art -->
  <g transform="translate(1360, 180)" stroke="#FF4D00" stroke-width="2" fill="none" opacity="0.8">
    <rect x="0" y="0" width="220" height="220" rx="8" stroke="#333333" stroke-width="2" />
    <rect x="30" y="30" width="160" height="160" rx="4" stroke="#FF4D00" stroke-width="2" stroke-dasharray="6 6" />
    <circle cx="110" cy="110" r="45" fill="#1C1C1C" stroke="#FF4D00" stroke-width="2" />
    <text x="110" y="117" fill="#FF4D00" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" text-anchor="middle">TB</text>
  </g>
</svg>`;

    // 2. Mobile Image: 4:3 ratio (1200 x 900)
    const mobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <defs>
    <linearGradient id="bg-m-${b.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A0A0A" />
      <stop offset="50%" stop-color="#141414" />
      <stop offset="100%" stop-color="#1E1E1E" />
    </linearGradient>
    <pattern id="grid-m-${b.id}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222222" stroke-width="0.75" />
    </pattern>
  </defs>

  <rect width="1200" height="900" fill="url(#bg-m-${b.id})" />
  <rect width="1200" height="900" fill="url(#grid-m-${b.id})" opacity="0.6" />
  <circle cx="1000" cy="150" r="300" fill="#FF4D00" opacity="0.14" />

  <rect x="20" y="20" width="1160" height="860" fill="none" stroke="#333333" stroke-width="1.5" rx="6" />
  <rect x="70" y="100" width="8" height="700" fill="#FF4D00" rx="2" />

  <g transform="translate(110, 0)">
    <!-- Badge -->
    <rect x="0" y="130" width="300" height="42" fill="#1C1C1C" stroke="#333333" stroke-width="1" rx="3" />
    <circle cx="24" cy="151" r="5" fill="#FF4D00" />
    <text x="42" y="157" fill="#EAEAEA" font-family="system-ui, sans-serif" font-size="14" font-weight="700" letter-spacing="3" text-transform="uppercase">${b.badge}</text>

    <!-- Main Title -->
    <text x="0" y="270" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="52" font-weight="800" letter-spacing="1.5" text-transform="uppercase">${b.title}</text>

    <!-- Subtitle (Wrapped for mobile) -->
    <text x="0" y="370" fill="#BDBDBD" font-family="system-ui, sans-serif" font-size="28" font-weight="400" letter-spacing="0.5">
      ${b.subtitle}
    </text>

    <!-- Subtext -->
    <text x="0" y="470" fill="#888888" font-family="system-ui, sans-serif" font-size="20" font-weight="500" letter-spacing="1" text-transform="uppercase">${b.subtext}</text>

    <!-- Button Graphic -->
    <g transform="translate(0, 560)">
      <rect x="0" y="0" width="460" height="74" fill="#FF4D00" rx="6" />
      <text x="230" y="45" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="18" font-weight="800" letter-spacing="2" text-anchor="middle" text-transform="uppercase">${b.action} →</text>
    </g>
  </g>
</svg>`;

    await sharp(Buffer.from(desktopSvg.trim()))
      .resize(1800, 600)
      .webp({ quality: 90 })
      .toFile(path.join(uploadDir, `${b.id}-desktop.webp`));

    await sharp(Buffer.from(mobileSvg.trim()))
      .resize(1200, 900)
      .webp({ quality: 90 })
      .toFile(path.join(uploadDir, `${b.id}-mobile.webp`));

    await sharp(Buffer.from(desktopSvg.trim()))
      .resize(600, 200)
      .webp({ quality: 85 })
      .toFile(path.join(uploadDir, `${b.id}-thumb.webp`));
  }

  console.log('  ✓ Generated 3 sample desktop (1800x600 WebP), mobile (1200x900 WebP), and thumb WebP banners');
}
