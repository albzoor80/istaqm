/**
 * Convert images to WebP using Sharp
 * Run: node scripts/convert-to-webp.js
 * 
 * 1) sitelib/categories: max width 600px
 * 2) sitelib/slides/id: max width 1920px
 * 3) sitelib/testimonials/id: max width 300px
 * 4) sitelib/posts/id: max 1920x2560, create thumb_*.webp
 * 5) sitelib/posts/id/gallery: full max 1920x2560, thumbs max width 600px
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.json');
const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif'];

function toWebpPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return filePath.slice(0, -ext.length) + '.webp';
}

function getImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (IMG_EXTS.includes(ext)) files.push(full);
    }
  }
  return files;
}

async function convertFile(srcPath, destPath, options) {
  const { maxWidth, maxHeight } = options;
  let pipeline = sharp(srcPath);
  const meta = await pipeline.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const needsResize = (maxWidth && w > maxWidth) || (maxHeight && h > maxHeight);
  if (needsResize) {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  await pipeline.webp({ quality: 85 }).toFile(destPath);
}

async function processFile(srcPath, destPath, options) {
  if (fs.existsSync(destPath)) {
    console.log('  Skip (exists):', path.basename(destPath));
    return false;
  }
  try {
    await convertFile(srcPath, destPath, options);
    if (fs.existsSync(srcPath)) fs.unlinkSync(srcPath);
    console.log('  OK:', path.basename(srcPath), '->', path.basename(destPath));
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('  Skip (source missing):', path.basename(srcPath));
      return false;
    }
    console.error('  Error:', srcPath, e.message);
    return false;
  }
}

function updateDatabase(db) {
  const norm = (p) => (p || '').replace(/\\/g, '/');
  let changed = 0;
  for (const key of ['Categories', 'Slides', 'Testimonials']) {
    const arr = db[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
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
      const newPath = toWebpPath(p.Image).replace(/\\/g, '/');
      p.Image = newPath;
      p.ImageThumb = (path.dirname(newPath) + '/thumb_' + path.basename(newPath)).replace(/\\/g, '/');
      changed++;
    } else if (ext === '.webp' && !p.ImageThumb) {
      p.ImageThumb = thumbPath;
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
  return changed;
}

async function run() {
  const dbPath = DB_PATH;
  let db = {};
  try {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    console.error('Cannot read database.json');
    process.exit(1);
  }

  // 1) Categories
  console.log('\n1) Categories (max width 600px)');
  const catDir = path.join(ROOT, 'sitelib', 'categories');
  const catFiles = getImageFiles(catDir);
  for (const f of catFiles) {
    const dest = toWebpPath(f);
    await processFile(f, dest, { maxWidth: 600 });
  }

  // 2) Slides
  console.log('\n2) Slides (max width 1920px)');
  const slidesDir = path.join(ROOT, 'sitelib', 'slides');
  if (fs.existsSync(slidesDir)) {
    const ids = fs.readdirSync(slidesDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    for (const id of ids) {
      const idDir = path.join(slidesDir, id);
      const files = getImageFiles(idDir);
      for (const f of files) {
        const dest = toWebpPath(f);
        await processFile(f, dest, { maxWidth: 1920 });
      }
    }
  }

  // 3) Testimonials
  console.log('\n3) Testimonials (max width 300px)');
  const testDir = path.join(ROOT, 'sitelib', 'testimonials');
  if (fs.existsSync(testDir)) {
    const ids = fs.readdirSync(testDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    for (const id of ids) {
      const idDir = path.join(testDir, id);
      const files = getImageFiles(idDir);
      for (const f of files) {
        const dest = toWebpPath(f);
        await processFile(f, dest, { maxWidth: 300 });
      }
    }
  }

  // 4) Posts (main image + thumb)
  console.log('\n4) Posts (max 1920x2560 + thumb 600px)');
  const postsDir = path.join(ROOT, 'sitelib', 'posts');
  if (fs.existsSync(postsDir)) {
    const postIds = fs.readdirSync(postsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    for (const postId of postIds) {
      const idDir = path.join(postsDir, postId);
      const files = getImageFiles(idDir);
      for (const f of files) {
        const base = path.basename(f);
        if (base.startsWith('thumb_')) continue;
        const dest = toWebpPath(f);
        await processFile(f, dest, { maxWidth: 1920, maxHeight: 2560 });
        const thumbDest = path.join(path.dirname(dest), 'thumb_' + path.basename(dest));
        if (fs.existsSync(dest) && !fs.existsSync(thumbDest)) {
          try {
            await convertFile(dest, thumbDest, { maxWidth: 600 });
            console.log('  Thumb OK: thumb_' + path.basename(dest));
          } catch (e) {
            console.error('  Thumb Error:', e.message);
          }
        }
      }
    }
  }

  // 5) Gallery (full images only; thumbs folders not used)
  console.log('\n5) Gallery (full 1920x2560)');
  if (fs.existsSync(postsDir)) {
    const postIds = fs.readdirSync(postsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    for (const postId of postIds) {
      const galleryDir = path.join(postsDir, postId, 'gallery');
      if (!fs.existsSync(galleryDir)) continue;
      const files = getImageFiles(galleryDir);
      for (const f of files) {
        const dir = path.dirname(f);
        const base = path.basename(f);
        if (dir.endsWith('thumbs') || base.startsWith('thumb')) continue;
        const dest = toWebpPath(f);
        await processFile(f, dest, { maxWidth: 1920, maxHeight: 2560 });
      }
    }
  }

  // Update database.json
  console.log('\nUpdating database.json...');
  const totalChanged = updateDatabase(db);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Database updated. Paths changed:', totalChanged);
  console.log('\nDone.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
