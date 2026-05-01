/**
 * Add ImageThumb to Posts that don't have it.
 * Generates thumb_*.webp (max 600px width) from source Image.
 * Run: node scripts/add-post-thumbs.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.json');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const posts = db.Posts || [];
let updated = 0;

async function run() {
  for (const p of posts) {
    if (!p.Image) continue;
    const imgPath = path.join(ROOT, p.Image.replace(/^\//, '').replace(/\//g, path.sep));
    const dir = path.dirname(imgPath);
    const base = path.basename(p.Image);
    const thumbRel = path.relative(ROOT, path.join(dir, 'thumb_' + base)).replace(/\\/g, '/');
    if (p.ImageThumb === thumbRel) continue;
    if (!fs.existsSync(imgPath)) {
      console.warn('Skip (file missing):', p.Image);
      continue;
    }
    const thumbPath = path.join(dir, 'thumb_' + base);
    try {
      await sharp(imgPath)
        .resize(600, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(thumbPath);
      p.ImageThumb = thumbRel;
      updated++;
      console.log('Added thumb:', thumbRel);
    } catch (e) {
      console.error('Error:', p.Image, e.message);
    }
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log('Done. Updated', updated, 'posts.');
}

run().catch(e => { console.error(e); process.exit(1); });
