/**
 * Initialize autoIDs in database.json
 * Run once to add the autoIDs object with current max IDs from each table.
 * Usage: node scripts/init-auto-ids.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.json');

const TABLE_ID_KEYS = {
  Users: 'UserID',
  Categories: 'CategoryID',
  Cities: 'CityID',
  Slides: 'SlideID',
  Posts: 'PostID',
  Galleries: 'GalleryID',
  Testimonials: 'TID'
};

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const autoIDs = db.autoIDs || {};

for (const [table, idKey] of Object.entries(TABLE_ID_KEYS)) {
  const arr = db[table];
  if (!Array.isArray(arr)) continue;
  const max = arr.reduce((m, item) => Math.max(m, item[idKey] || 0), 0);
  const current = autoIDs[idKey];
  if (current === undefined || max > current) {
    autoIDs[idKey] = max;
  }
}

db.autoIDs = autoIDs;
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log('autoIDs initialized:', autoIDs);
