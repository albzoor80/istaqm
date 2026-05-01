/**
 * Create thumbs for existing gallery images.
 * Puts thumb in gallery/thumbs/ with same filename, max 300px width.
 * Run: node scripts/add-gallery-thumbs.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.json');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const galleries = db.Galleries || [];
let created = 0;

async function run() {
  for (const g of galleries) {
    if (!g.Image) continue;
    const imgPath = path.join(ROOT, g.Image.replace(/^\//, '').replace(/\//g, path.sep));
    const dir = path.dirname(imgPath);
    const thumbsDir = path.join(dir, 'thumbs');
    const base = path.basename(g.Image);
    const thumbPath = path.join(thumbsDir, base);
    if (fs.existsSync(thumbPath)) continue;
    if (!fs.existsSync(imgPath)) {
      console.warn('Skip (file missing):', g.Image);
      continue;
    }
    try {
      if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
      await sharp(imgPath)
        .resize(300, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(thumbPath);
      created++;
      console.log('Created:', path.relative(ROOT, thumbPath));
    } catch (e) {
      console.error('Error:', g.Image, e.message);
    }
  }
  console.log('Done. Created', created, 'gallery thumbs.');
}

run().catch(e => { console.error(e); process.exit(1); });
