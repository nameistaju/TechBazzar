import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const Database = require(path.join(process.cwd(), 'node_modules/better-sqlite3'));
const db = new Database(path.join(process.cwd(), 'apps/api/db/techbazaar.db'));

// 1. Normalize Headphones -> headphones in DB
const r1 = db.prepare("UPDATE products SET category = 'headphones' WHERE category = 'Headphones'").run();
const r2 = db.prepare("UPDATE discounts SET scope_values = REPLACE(scope_values, 'Headphones', 'headphones') WHERE scope_values LIKE '%Headphones%'").run();
console.log('Normalized Headphones in DB:', { productsUpdated: r1.changes, discountsUpdated: r2.changes });

// 2. Scan apps/web/public/images & apps/web/public/images/phone cases
const dirs = [
  path.join(process.cwd(), 'apps/web/public/images'),
  path.join(process.cwd(), 'apps/web/public/images/phone cases')
];

let totalBeforeBytes = 0;
let totalAfterBytes = 0;
let gifsConverted = 0;
let variantsCreated = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!['.gif', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    // Skip already generated responsive variants
    if (/-(200|480|1000)\.webp$/i.test(ent.name)) continue;

    const fullPath = path.join(dir, ent.name);
    const stat = fs.statSync(fullPath);
    const baseName = ent.name.slice(0, -ext.length);

    if (ext === '.gif') {
      totalBeforeBytes += stat.size;
      const webpPoster = path.join(dir, `${baseName}.webp`);
      const gifBuf = fs.readFileSync(fullPath);
      await sharp(gifBuf, { animated: false })
        .webp({ quality: 82 })
        .toFile(webpPoster);
      totalAfterBytes += fs.statSync(webpPoster).size;
      gifsConverted++;

      // Generate responsive widths from the static poster
      const posterBuf = fs.readFileSync(webpPoster);
      for (const w of [200, 480, 1000]) {
        const out = path.join(dir, `${baseName}-${w}.webp`);
        await sharp(posterBuf)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(out);
        variantsCreated++;
      }
      // Remove original heavy GIF after verified conversion
      try { fs.unlinkSync(fullPath); } catch {}
    } else {
      // Generate 200, 480, 1000 WebP variants if missing
      let srcBuf = null;
      for (const w of [200, 480, 1000]) {
        const out = path.join(dir, `${baseName}-${w}.webp`);
        if (!fs.existsSync(out)) {
          if (!srcBuf) srcBuf = fs.readFileSync(fullPath);
          await sharp(srcBuf)
            .resize({ width: w, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(out);
          variantsCreated++;
        }
      }
    }
  }
}

// 3. Update DB product image & images columns (.gif -> .webp)
const gifProducts = db.prepare("SELECT id, image, images FROM products WHERE image LIKE '%.gif%' OR images LIKE '%.gif%'").all();
const updateProdImg = db.prepare('UPDATE products SET image = ?, images = ? WHERE id = ?');
for (const p of gifProducts) {
  const newImg = p.image ? p.image.replace(/\.gif$/i, '.webp') : p.image;
  const newImgs = p.images ? p.images.replace(/\.gif/gi, '.webp') : p.images;
  updateProdImg.run(newImg, newImgs, p.id);
}

console.log('Image optimization complete:', {
  gifsConverted,
  gifProductsUpdated: gifProducts.length,
  variantsCreated,
  gifBeforeMB: (totalBeforeBytes / (1024 * 1024)).toFixed(2),
  webpAfterMB: (totalAfterBytes / (1024 * 1024)).toFixed(2)
});
