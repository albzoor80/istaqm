/**
 * Update database.json to use .webp paths (run after convert-to-webp.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.json');
const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'];

function toWebpPath(p) {
  const ext = path.extname(p).toLowerCase();
  return p.slice(0, -ext.length) + '.webp';
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
let changed = 0;

for (const key of ['Categories', 'Slides', 'Testimonials']) {
  for (const item of db[key] || []) {
    if (!item.Image) continue;
    const ext = path.extname(item.Image).toLowerCase();
    if (IMG_EXTS.includes(ext)) {
      item.Image = toWebpPath(item.Image).replace(/\\/g, '/');
      changed++;
    }
  }
}

for (const p of db.Posts || []) {
  if (!p.Image) continue;
  const ext = path.extname(p.Image).toLowerCase();
  const dir = path.dirname(p.Image);
  const base = path.basename(p.Image);
  const thumbPath = (dir + '/thumb_' + base).replace(/\\/g, '/');
  if (IMG_EXTS.includes(ext)) {
    p.Image = toWebpPath(p.Image).replace(/\\/g, '/');
    p.ImageThumb = (path.dirname(p.Image) + '/thumb_' + path.basename(p.Image)).replace(/\\/g, '/');
    changed++;
  } else if (ext === '.webp' && !p.ImageThumb) {
    p.ImageThumb = (path.dirname(p.Image) + '/thumb_' + path.basename(p.Image)).replace(/\\/g, '/');
    changed++;
  }
}

for (const g of db.Galleries || []) {
  if (!g.Image) continue;
  const ext = path.extname(g.Image).toLowerCase();
  if (IMG_EXTS.includes(ext)) {
    g.Image = toWebpPath(g.Image).replace(/\\/g, '/');
    changed++;
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('Database updated. Paths changed:', changed);
