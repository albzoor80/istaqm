require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const xml2js = require('xml2js');
const geoip = require('geoip-lite');
const svgCaptcha = require('svg-captcha');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 5006;
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy when behind nginx/reverse proxy (required for X-Forwarded-For, express-rate-limit)
app.set('trust proxy', 1);

const captchaStore = new Map();
const CAPTCHA_TTL = 5 * 60 * 1000;

function cleanupCaptcha() {
  const now = Date.now();
  for (const [id, data] of captchaStore.entries()) {
    if (data.expires < now) captchaStore.delete(id);
  }
}

const DB_PATH = path.join(__dirname, 'database.json');
const COUNTRIES_PATH = path.join(__dirname, 'Countries.xml');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    return first;
  }
  const remote = req.socket.remoteAddress || '';
  return remote.replace(/^::ffff:/, '');
}

function readCountriesXml(cb) {
  fs.readFile(COUNTRIES_PATH, 'utf8', (err, raw) => {
    if (err) return cb(err, null, null);
    const parser = new xml2js.Parser();
    parser.parseString(raw, (parseErr, result) => {
      if (parseErr) return cb(parseErr, null, null);
      const list = result?.countries?.country;
      const arr = Array.isArray(list) ? list : list ? [list] : [];
      return cb(null, arr, raw);
    });
  });
}

function writeCountriesXml(raw, cb) {
  fs.writeFile(COUNTRIES_PATH, raw, 'utf8', (err) => {
    if (cb) cb(err);
  });
}

let dbCache = null;

function getFolderSize(folderPath) {
  if (!fs.existsSync(folderPath)) return 0;
  let size = 0;
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(folderPath, ent.name);
      if (ent.isDirectory()) {
        size += getFolderSize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch (e) {
    return 0;
  }
  return size;
}

function getCachedDb() {
  if (dbCache) return dbCache;
  try {
    dbCache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    dbCache.folderSize = getFolderSize(path.join(__dirname, 'sitelib')) + getFolderSize(path.join(__dirname, 'images'));
    return dbCache;
  } catch (e) {
    return { Categories: [], Slides: [], Testimonials: [], Posts: [], Galleries: [], Cities: [] };
  }
}

function reloadDbCache() {
  dbCache = null;
  return getCachedDb();
}

function getNextId(db, idKey) {
  const autoIDs = db.autoIDs || {};
  const next = (autoIDs[idKey] || 0) + 1;
  db.autoIDs = { ...autoIDs, [idKey]: next };
  return next;
}

async function parseCountries() {
  return new Promise((resolve) => {
    try {
      const xml = fs.readFileSync(COUNTRIES_PATH, 'utf8');
      xml2js.parseString(xml, (err, result) => {
        resolve(err ? { countries: { country: [] } } : result);
      });
    } catch (e) {
      resolve({ countries: { country: [] } });
    }
  });
}

async function getVisitorStats(opts = {}) {
  const parsed = await parseCountries();
  const countries = parsed?.countries?.country || [];
  let totalVisits = 0;
  countries.forEach(c => {
    totalVisits += parseInt(c.$.visitorsCount || '0', 10);
  });
  const filtered = countries
    .map(c => ({
      code: (c.$.code || '').toLowerCase(),
      arName: c.$.arName || '',
      enName: c.$.enName || '',
      visitorsCount: parseInt(c.$.visitorsCount || '0', 10)
    }))
    .filter(c => c.visitorsCount > 0)
    .sort((a, b) => b.visitorsCount - a.visitorsCount);
  const totalCountries = filtered.length;
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(opts.pageSize, 10) || 10));
  const start = (page - 1) * pageSize;
  const countryList = filtered.slice(start, start + pageSize);
  return {
    totalVisits,
    countryList,
    totalCountries,
    page,
    pageSize,
    totalPages: Math.ceil(totalCountries / pageSize) || 1
  };
}

// Security: Helmet sets secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compression: gzip/deflate responses for faster transfer
app.use(compression());

// Rate limiting: general API protection (~7 requests per page load)
const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 160,
  message: { ok: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/record-visit'
});

// Visit recording: 1 per hour per IP
const recordVisitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limits for contact form and captcha (abuse prevention)
const contactLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Too many contact attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'istaqm-dash-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: isProd, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GoogleClient_Id,
  clientSecret: process.env.GoogleClient_Secret,
  callbackURL: (process.env.BASE_URL || 'http://localhost:5006') + '/callback'
}, (accessToken, refreshToken, profile, done) => {
  const email = (profile.emails?.[0]?.value || '').toLowerCase().trim();
  if (!email) return done(null, false, { message: 'No email from Google' });
  const db = getCachedDb();
  const users = db.Users || [];
  const dbUser = users.find(u => (u.Email || '').toLowerCase().trim() === email);
  if (!dbUser) return done(null, false, { message: 'User not authorized' });
  const imgPath = dbUser.Image ? '/' + dbUser.Image.replace(/^\/+/, '') : (profile.photos?.[0]?.value || '');
  return done(null, {
    id: dbUser.UserID,
    email: dbUser.Email,
    name: dbUser.Name,
    picture: imgPath,
    role: dbUser.Role
  });
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

function requireAuth(req, res, next) {
  // if (req.isAuthenticated && req.isAuthenticated()) return next();
  // const acceptsHtml = req.accepts('html') || (req.get('Accept') || '').includes('text/html');
  // if (acceptsHtml) return res.redirect(302, '/404');
  // res.status(401).json({ error: 'Unauthorized' });
  return next();
}

function requireAdmin(req, res, next) {
  const role = (req.user && req.user.role) || '';
  if (role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required' });
}

const categoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});
const postUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
const slideUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
const testimonialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
const userUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use('/api/record-visit', recordVisitLimiter);
app.use('/api/contact', contactLimiter);
app.use('/api/verify-login-captcha', contactLimiter);
app.use('/api', apiLimiter);

const staticOpts = { maxAge: isProd ? '1d' : 0 };
app.use('/images', express.static(path.join(__dirname, 'images'), staticOpts));
app.use('/sitelib', express.static(path.join(__dirname, 'sitelib'), staticOpts));
app.use('/css', express.static(path.join(__dirname, 'css'), staticOpts));
app.use('/js', express.static(path.join(__dirname, 'js'), staticOpts));

app.get('/ping', (req, res) => res.send('pong'));

app.get('/api/home', (req, res) => {
  const db = getCachedDb();
  const posts = (db.Posts || []).filter(p => p.Publish === 1);
  const categories = (db.Categories || []).filter(c => c.Publish === 1).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  const postsByCategory = {};
  categories.forEach(c => {
    postsByCategory[c.CategoryID] = posts.filter(p => p.CategoryID === c.CategoryID).length;
  });
  const categoriesWithCount = categories.map(c => ({ ...c, postCount: postsByCategory[c.CategoryID] || 0 }));
  res.json({
    Slides: (db.Slides || []).filter(s => s.Publish === 1).sort((a, b) => (a.Order || 0) - (b.Order || 0)),
    Categories: categoriesWithCount,
    Testimonials: (db.Testimonials || []).filter(t => t.Publish === 1).sort((a, b) => (a.Order || 0) - (b.Order || 0))
  });
});

app.get('/api/projects', (req, res) => {
  const db = getCachedDb();
  const category = parseInt(req.query.category, 10) || 0;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 24));
  const postId = parseInt(req.query.postId, 10) || null;

  let posts = (db.Posts || []).filter(p => p.Publish === 1);
  if (category > 0) posts = posts.filter(p => p.CategoryID === category);
  posts = posts.sort((a, b) => (a.Order || 999999) - (b.Order || 999999) || new Date(b.CreateDate || 0) - new Date(a.CreateDate || 0));

  let targetPage = page;
  let targetCategory = category;
  if (postId) {
    const post = posts.find(p => p.PostID === postId);
    if (post) {
      targetCategory = post.CategoryID || 0;
      if (targetCategory > 0) posts = posts.filter(p => p.CategoryID === targetCategory);
      const idx = posts.findIndex(p => p.PostID === postId);
      if (idx >= 0) targetPage = Math.floor(idx / pageSize) + 1;
    }
  }

  const total = posts.length;
  const start = (targetPage - 1) * pageSize;
  const pagePosts = posts.slice(start, start + pageSize);
  const postIds = pagePosts.map(p => p.PostID);

  const galleries = (db.Galleries || []).filter(g => postIds.includes(g.PostID)).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  const cities = db.Cities || [];
  const categories = (db.Categories || []).filter(c => c.Publish === 1).sort((a, b) => (a.Order || 0) - (b.Order || 0));

  const payload = {
    Categories: categories,
    Posts: pagePosts,
    total: total,
    page: targetPage,
    pageSize: pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    Cities: cities,
    Galleries: galleries
  };
  if (postId) payload.category = targetCategory;
  res.json(payload);
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getVisitorStats();
    const db = getCachedDb();
    stats.totalProjects = (db.Posts || []).filter(p => p.Publish === 1).length;
    res.json(stats);
  } catch (e) {
    res.json({ totalVisits: 0, countryList: [], totalProjects: 0 });
  }
});

app.post('/api/record-visit', (req, res) => {
  const ip = getClientIp(req);
  const geo = geoip.lookup(ip);
  const countryCode = geo && geo.country ? String(geo.country).toLowerCase() : null;
  if (!countryCode) {
    res.writeHead(204, {});
    res.end();
    return;
  }
  readCountriesXml((err, arr, raw) => {
    if (err || !arr) {
      res.writeHead(204, {});
      res.end();
      return;
    }
    const country = arr.find((c) => ((c.$ && c.$.code) || '').toLowerCase() === countryCode);
    if (!country) {
      res.writeHead(204, {});
      res.end();
      return;
    }
    const codeAttr = (country.$.code || country.code || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lineRegex = new RegExp('.*code="' + codeAttr + '".*');
    const newRaw = raw.split('\n').map((line) => {
      if (!lineRegex.test(line)) return line;
      return line.replace(/visitorsCount="(\d+)"/, (_, n) => 'visitorsCount="' + (parseInt(n, 10) + 1) + '"');
    }).join('\n');
    if (newRaw === raw) {
      res.writeHead(204, {});
      res.end();
      return;
    }
    res.writeHead(204, {});
    res.end();
    setImmediate(() => {
      writeCountriesXml(newRaw, () => {});
    });
  });
});

app.get('/api/visitors', (req, res) => {
  readCountriesXml((err, arr, raw) => {
    if (err || !arr) return res.status(500).json({ error: err?.message || 'Failed to read countries XML' });
    const countries = arr.map((c) => {
      const attrs = c.$ || c;
      return {
        enName: attrs.enName || '',
        visitorsCount: parseInt(attrs.visitorsCount || '0', 10)
      };
    }).filter((c) => c.enName);
    res.json(countries);
  });
});

app.get('/api/captcha', (req, res) => {
  cleanupCaptcha();
  const captcha = svgCaptcha.create({ ignoreChars: '0oO1ilI', noise: 2 });
  const id = crypto.randomUUID();
  captchaStore.set(id, { text: captcha.text.toLowerCase(), expires: Date.now() + CAPTCHA_TTL });
  res.cookie('captchaId', id, {
    httpOnly: true,
    maxAge: CAPTCHA_TTL,
    sameSite: 'lax',
    secure: isProd
  });
  res.type('svg').send(captcha.data);
});

app.post('/api/verify-login-captcha', (req, res) => {
  const captchaId = req.cookies?.captchaId;
  const stored = captchaStore.get(captchaId);
  const { captcha } = req.body || {};
  captchaStore.delete(captchaId);
  if (!stored || stored.text !== (captcha || '').toLowerCase().trim()) {
    return res.status(400).json({ ok: false, error: 'Invalid captcha' });
  }
  res.json({ ok: true });
});

function sanitize(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message, captcha } = req.body;
  const captchaId = req.cookies?.captchaId;
  const stored = captchaStore.get(captchaId);
  captchaStore.delete(captchaId);
  if (!stored || stored.text !== (captcha || '').toLowerCase().trim()) {
    return res.status(400).json({ ok: false, error: 'Invalid captcha' });
  }
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }
  const safeName = sanitize(name, 100);
  const safeSubject = sanitize(subject, 150);
  const safeMessage = sanitize(message, 2000);
  const recipient = process.env.RECIPIENT_EMAIL || 'albzoor80@yahoo.com';
  const transporter = nodemailer.createTransport({
    host: process.env.SmtpServer,
    port: parseInt(process.env.SmtpPort || '587', 10),
    secure: false,
    auth: {
      user: process.env.SmtpUsername,
      pass: process.env.SmtpPassword
    }
  });
  try {
    await transporter.sendMail({
      from: `"${process.env.SenderName || 'Istaqim'}" <${process.env.SenderEmail || process.env.SmtpUsername}>`,
      to: recipient,
      subject: `[Istaqim Contact] ${safeSubject}`,
      text: `Name: ${safeName}\nEmail: ${email.trim()}\n\n${safeMessage}`,
      replyTo: email.trim()
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Contact email error:', err);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, 'projects.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about_us.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact_us.html'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/en', (req, res) => res.redirect('/'));
app.get('/ar', (req, res) => res.redirect('/'));

app.get('/404', (req, res) => {
  const code = req.query.code || '404';
  const status = code === '500' ? 500 : 404;
  res.status(status).sendFile(path.join(__dirname, '404.html'));
});

// Dashboard API (require auth)
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const countryPage = Math.max(1, parseInt(req.query.countryPage, 10) || 1);
    const countryPageSize = Math.min(50, Math.max(1, parseInt(req.query.countryPageSize, 10) || 20));
    const stats = await getVisitorStats({ page: countryPage, pageSize: countryPageSize });
    const db = getCachedDb();
    stats.totalProjects = (db.Posts || []).filter(p => p.Publish === 1).length;
    stats.totalProjectsImages = (db.Galleries || []).length;
    stats.totalCategories = (db.Categories || []).length;
    stats.totalCities = (db.Cities || []).length;
    stats.totalSlides = (db.Slides || []).length;
    stats.totalTestimonials = (db.Testimonials || []).length;
    stats.totalUsers = (db.Users || []).length;
    stats.folderSize = (db.folderSize || 0) / (1024 * 1024 * 1024); // in GB
    res.json(stats);
  } catch (e) {
    res.json({ totalVisits: 0, totalCountries: 0, countryList: [], totalProjects: 0, totalProjectsImages: 0, totalCategories: 0, totalSlides: 0, totalTestimonials: 0, totalUsers: 0, folderSize: 0 });
  }
});

function postFilteredTitle(titleAr, titleEn) {
  const ar = (titleAr || '').trim();
  const en = (titleEn || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ar ? (ar + (en ? '-' + en : '')) : en || '';
}

app.get('/api/dashboard/posts', requireAuth, (req, res) => {
  const db = getCachedDb();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  let posts = (db.Posts || []).sort((a, b) => (a.Order || 999999) - (b.Order || 999999) || new Date(b.CreateDate || 0) - new Date(a.CreateDate || 0));
  const search = (req.query.search || '').trim().toLowerCase();
  const categoryID = req.query.categoryID ? parseInt(req.query.categoryID, 10) : null;
  const cityID = req.query.cityID ? parseInt(req.query.cityID, 10) : null;
  if (search) {
    posts = posts.filter(p => {
      const titleEn = (p.TitleEn || '').toLowerCase();
      const titleAr = (p.TitleAr || '').toLowerCase();
      const descEn = (p.DescriptionEn || '').toLowerCase();
      const descAr = (p.DescriptionAr || '').toLowerCase();
      return titleEn.includes(search) || titleAr.includes(search) || descEn.includes(search) || descAr.includes(search);
    });
  }
  if (categoryID) posts = posts.filter(p => p.CategoryID === categoryID);
  if (cityID) posts = posts.filter(p => p.CityID === cityID);
  const total = posts.length;
  const start = (page - 1) * pageSize;
  const items = posts.slice(start, start + pageSize);
  const categories = db.Categories || [];
  const cities = db.Cities || [];
  const galleries = db.Galleries || [];
  const withNames = items.map(p => ({
    ...p,
    categoryName: (categories.find(c => c.CategoryID === p.CategoryID) || {}).TitleEn || '-',
    cityName: (cities.find(c => c.CityID === p.CityID) || {}).TitleEn || '-',
    galleries: (galleries.filter(g => g.PostID === p.PostID) || []).sort((a, b) => (a.Order || 0) - (b.Order || 0))
  }));
  res.json({ items: withNames, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 });
});

app.post('/api/dashboard/posts/upload', requireAuth, postUpload.single('image'), async (req, res) => {
  const postId = parseInt(req.body.postId, 10);
  if (!postId) return res.status(400).json({ error: 'postId required' });
  if (!req.file) return res.status(400).json({ error: 'No image file' });
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
  }
  const postsDir = path.join(__dirname, 'sitelib', 'posts', String(postId));
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(postsDir, baseName + '.webp');
  const thumbPath = path.join(postsDir, 'thumb_' + baseName + '.webp');
  try {
    if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
    const buf = req.file.buffer;
    await sharp(buf).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
    await sharp(buf).rotate().resize(600, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const thumbRelPath = path.relative(__dirname, thumbPath).replace(/\\/g, '/');
    res.json({ ok: true, path: relPath, imageThumb: thumbRelPath });
  } catch (e) {
    console.error('Post image upload error:', e);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.post('/api/dashboard/posts', requireAuth, postUpload.single('image'), async (req, res) => {
  const db = getCachedDb();
  const { TitleEn, TitleAr, DescriptionEn, DescriptionAr, CategoryID, CityID, Publish } = req.body || {};
  const titleEn = sanitize(TitleEn || '', 200);
  const titleAr = sanitize(TitleAr || '', 200);
  const descriptionEn = sanitize(DescriptionEn || '', 5000) || null;
  const descriptionAr = sanitize(DescriptionAr || '', 5000) || null;
  if (!titleEn) return res.status(400).json({ error: 'Title (En) is required' });
  if (!titleAr) return res.status(400).json({ error: 'Title (Ar) is required' });
  if (!req.file) return res.status(400).json({ error: 'Project image is required' });
  const categoryId = parseInt(CategoryID, 10);
  const cityId = parseInt(CityID, 10);
  if (!categoryId) return res.status(400).json({ error: 'Category is required' });
  if (!cityId) return res.status(400).json({ error: 'City is required' });
  const posts = [...(db.Posts || [])];
  const newId = getNextId(db, 'PostID');
  const maxOrder = posts.reduce((m, p) => Math.max(m, p.Order || 0), 0);
  const postsDir = path.join(__dirname, 'sitelib', 'posts', String(newId));
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(postsDir, baseName + '.webp');
  const thumbPath = path.join(postsDir, 'thumb_' + baseName + '.webp');
  try {
    if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
    const buf = req.file.buffer;
    await sharp(buf).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
    await sharp(buf).rotate().resize(600, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const thumbRelPath = path.relative(__dirname, thumbPath).replace(/\\/g, '/');
    const now = new Date().toISOString();
    const newPost = {
      PostID: newId,
      CategoryID: categoryId,
      CityID: cityId,
      Image: relPath,
      ImageThumb: thumbRelPath,
      TitleEn: titleEn,
      TitleAr: titleAr,
      FilteredTitle: postFilteredTitle(titleAr, titleEn),
      DescriptionAr: descriptionAr,
      DescriptionEn: descriptionEn,
      Visits: 0,
      CreateDate: now,
      PostedByID: req.user?.id || 1,
      ModifierID: req.user?.id || 1,
      LastModifiedDate: now,
      Publish: (Publish === true || Publish === 1 || Publish === 'true' || Publish === '1' || Publish === 'on') ? 1 : 0,
      Type: 1,
      Comments: null,
      Order: maxOrder + 1
    };
    posts.push(newPost);
    writeDb({ ...db, Posts: posts });
    res.json({ ok: true, item: newPost });
  } catch (e) {
    console.error('Post create error:', e);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/dashboard/posts/:id', requireAuth, postUpload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const { TitleEn, TitleAr, DescriptionEn, DescriptionAr, CategoryID, CityID, Publish } = req.body || {};
  const posts = [...(db.Posts || [])];
  const idx = posts.findIndex(p => p.PostID === id);
  if (idx < 0) return res.status(404).json({ error: 'Project not found' });
  const titleEn = TitleEn !== undefined ? sanitize(String(TitleEn), 200) : posts[idx].TitleEn;
  const titleAr = TitleAr !== undefined ? sanitize(String(TitleAr), 200) : posts[idx].TitleAr;
  const descriptionEn = DescriptionEn !== undefined ? (sanitize(String(DescriptionEn), 5000) || null) : posts[idx].DescriptionEn;
  const descriptionAr = DescriptionAr !== undefined ? (sanitize(String(DescriptionAr), 5000) || null) : posts[idx].DescriptionAr;
  if (!titleEn) return res.status(400).json({ error: 'Title (En) is required' });
  if (!titleAr) return res.status(400).json({ error: 'Title (Ar) is required' });
  const categoryId = CategoryID !== undefined ? parseInt(CategoryID, 10) : posts[idx].CategoryID;
  const cityId = CityID !== undefined ? parseInt(CityID, 10) : posts[idx].CityID;
  if (!categoryId) return res.status(400).json({ error: 'Category is required' });
  if (!cityId) return res.status(400).json({ error: 'City is required' });
  let imagePath = posts[idx].Image;
  let imageThumbPath = posts[idx].ImageThumb;
  if (req.file) {
    const postsDir = path.join(__dirname, 'sitelib', 'posts', String(id));
    const baseName = crypto.randomBytes(16).toString('hex');
    const outPath = path.join(postsDir, baseName + '.webp');
    const thumbPath = path.join(postsDir, 'thumb_' + baseName + '.webp');
    try {
      if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
      const buf = req.file.buffer;
    await sharp(buf).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
    await sharp(buf).rotate().resize(600, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbPath);
      const oldPath = posts[idx].Image;
      const oldThumb = posts[idx].ImageThumb;
      if (oldPath) {
        const oldFull = path.join(__dirname, oldPath.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldFull)) { try { fs.unlinkSync(oldFull); } catch (e) { console.error(e); } }
      }
      if (oldThumb) {
        const oldThumbFull = path.join(__dirname, oldThumb.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldThumbFull)) { try { fs.unlinkSync(oldThumbFull); } catch (e) { console.error(e); } }
      }
      imagePath = path.relative(__dirname, outPath).replace(/\\/g, '/');
      imageThumbPath = path.relative(__dirname, thumbPath).replace(/\\/g, '/');
    } catch (e) {
      console.error('Post image update error:', e);
      return res.status(500).json({ error: 'Failed to update image' });
    }
  }
  posts[idx] = {
    ...posts[idx],
    TitleEn: titleEn,
    TitleAr: titleAr,
    DescriptionEn: descriptionEn,
    DescriptionAr: descriptionAr,
    FilteredTitle: postFilteredTitle(titleAr, titleEn),
    CategoryID: categoryId,
    CityID: cityId,
    Image: imagePath,
    ImageThumb: imageThumbPath,
    Publish: Publish !== undefined ? ((Publish === true || Publish === 1 || Publish === 'true' || Publish === '1' || Publish === 'on') ? 1 : 0) : posts[idx].Publish,
    LastModifiedDate: new Date().toISOString()
  };
  writeDb({ ...db, Posts: posts });
  res.json({ ok: true, item: posts[idx] });
});

app.patch('/api/dashboard/posts/reorder', requireAuth, (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const posts = [...(db.Posts || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const affected = posts.filter(p => orderSet.has(p.PostID));
    const minOrder = affected.length ? Math.min(...affected.map(p => p.Order || 999999)) : 1;
    const reordered = order.map((id, i) => {
      const p = posts.find(x => x.PostID === parseInt(id, 10));
      return p ? { ...p, Order: minOrder + i } : null;
    }).filter(Boolean);
    const others = posts.filter(p => !orderSet.has(p.PostID));
    const withOrder = [...others, ...reordered].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Posts: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error reordering posts:', e);
    res.status(500).json({ error: 'Failed to reorder projects' });
  }
});

app.post('/api/dashboard/posts/:id/gallery/upload', requireAuth, postUpload.single('image'), async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (!req.file) return res.status(400).json({ error: 'No image file' });
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type.' });
  }
  const db = getCachedDb();
  const post = (db.Posts || []).find(p => p.PostID === postId);
  if (!post) return res.status(404).json({ error: 'Project not found' });
  const galleryDir = path.join(__dirname, 'sitelib', 'posts', String(postId), 'gallery');
  const thumbsDir = path.join(galleryDir, 'thumbs');
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(galleryDir, baseName + '.webp');
  const thumbPath = path.join(thumbsDir, baseName + '.webp');
  try {
    if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
    const buf = req.file.buffer;
    await sharp(buf).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
    await sharp(buf).rotate().resize(300, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const galleries = [...(db.Galleries || [])];
    const newId = getNextId(db, 'GalleryID');
    const maxOrder = galleries.filter(g => g.PostID === postId).reduce((m, g) => Math.max(m, g.Order || 0), 0);
    const newGallery = { GalleryID: newId, PostID: postId, Image: relPath, Order: maxOrder + 1, YTube: null };
    galleries.push(newGallery);
    writeDb({ ...db, Galleries: galleries });
    res.json({ ok: true, item: newGallery });
  } catch (e) {
    console.error('Gallery upload error:', e);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.post('/api/dashboard/posts/:id/gallery/video', requireAuth, postUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const videoFile = req.files && req.files.video && req.files.video[0];
  const imageFile = req.files && req.files.image && req.files.image[0];
  if (!videoFile) return res.status(400).json({ error: 'No video file' });
  if (!imageFile) return res.status(400).json({ error: 'Please also add a thumbnail image for the video.' });
  const videoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-ms-wmv', 'video/3gpp', 'video/3gpp2'];
  if (!videoMimes.includes(videoFile.mimetype)) {
    return res.status(400).json({ error: 'Invalid video type. Use MP4, WebM, OGG, MOV, AVI, MKV, WMV or 3GP.' });
  }
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(imageFile.mimetype)) {
    return res.status(400).json({ error: 'Invalid thumbnail image type. Use JPEG, PNG, GIF or WebP.' });
  }
  const db = getCachedDb();
  const post = (db.Posts || []).find(p => p.PostID === postId);
  if (!post) return res.status(404).json({ error: 'Project not found' });
  const galleryDir = path.join(__dirname, 'sitelib', 'posts', String(postId), 'gallery');
  const thumbsDir = path.join(galleryDir, 'thumbs');
  const ext = path.extname(videoFile.originalname) || '.mp4';
  const baseName = crypto.randomBytes(16).toString('hex');
  const videoPath = path.join(galleryDir, baseName + ext);
  const thumbOutPath = path.join(galleryDir, baseName + '.webp');
  const thumbSmallPath = path.join(thumbsDir, baseName + '.webp');
  try {
    if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
    fs.writeFileSync(videoPath, videoFile.buffer);
    await sharp(imageFile.buffer).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbOutPath);
    await sharp(imageFile.buffer).rotate().resize(300, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbSmallPath);
    const videoRelPath = path.relative(__dirname, videoPath).replace(/\\/g, '/');
    const imageRelPath = path.relative(__dirname, thumbOutPath).replace(/\\/g, '/');
    const galleries = [...(db.Galleries || [])];
    const maxOrder = galleries.filter(g => g.PostID === postId).reduce((m, g) => Math.max(m, g.Order || 0), 0);
    const newGallery = { GalleryID: getNextId(db, 'GalleryID'), PostID: postId, Image: imageRelPath, YTube: videoRelPath, Order: maxOrder + 1 };
    galleries.push(newGallery);
    writeDb({ ...db, Galleries: galleries });
    res.json({ ok: true, item: newGallery });
  } catch (e) {
    console.error('Gallery video upload error:', e);
    res.status(500).json({ error: 'Failed to save video' });
  }
});

function getYouTubeVideoIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fetchYouTubeThumbnail(videoId) {
  return new Promise((resolve, reject) => {
    const urls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    ];
    let idx = 0;
    function tryNext() {
      if (idx >= urls.length) return reject(new Error('Could not fetch thumbnail'));
      https.get(urls[idx], (res) => {
        if (res.statusCode === 200) {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        } else {
          idx++;
          tryNext();
        }
      }).on('error', () => { idx++; tryNext(); });
    }
    tryNext();
  });
}

app.post('/api/dashboard/posts/:id/gallery/youtube', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { url } = req.body || {};
  const ytube = (url || '').trim();
  if (!ytube) return res.status(400).json({ error: 'YouTube URL required' });
  const videoId = getYouTubeVideoIdFromUrl(ytube);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });
  const db = getCachedDb();
  const post = (db.Posts || []).find(p => p.PostID === postId);
  if (!post) return res.status(404).json({ error: 'Project not found' });
  const galleryDir = path.join(__dirname, 'sitelib', 'posts', String(postId), 'gallery');
  const thumbsDir = path.join(galleryDir, 'thumbs');
  let imageRelPath = null;
  try {
    const thumbBuf = await fetchYouTubeThumbnail(videoId);
    const baseName = crypto.randomBytes(16).toString('hex') + '.webp';
    const outPath = path.join(galleryDir, baseName);
    const thumbPath = path.join(thumbsDir, baseName);
    if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
    await sharp(thumbBuf).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
    await sharp(thumbBuf).rotate().resize(300, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbPath);
    imageRelPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
  } catch (e) {
    console.error('YouTube thumbnail fetch error:', e);
  }
  const galleries = [...(db.Galleries || [])];
  const maxOrder = galleries.filter(g => g.PostID === postId).reduce((m, g) => Math.max(m, g.Order || 0), 0);
  const newGallery = { GalleryID: getNextId(db, 'GalleryID'), PostID: postId, Image: imageRelPath, Order: maxOrder + 1, YTube: ytube };
  galleries.push(newGallery);
  writeDb({ ...db, Galleries: galleries });
  res.json({ ok: true, item: newGallery });
});

app.patch('/api/dashboard/galleries/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { YTube, keepExistingImage } = req.body || {};
  const db = getCachedDb();
  const galleries = [...(db.Galleries || [])];
  const idx = galleries.findIndex(g => g.GalleryID === id);
  if (idx < 0) return res.status(404).json({ error: 'Gallery item not found' });
  const g = galleries[idx];
  let imageRelPath = g.Image;
  if (YTube != null && YTube && !keepExistingImage) {
    const videoId = getYouTubeVideoIdFromUrl(YTube);
    if (videoId) {
      const hadYoutubeUrl = g.YTube && /youtube\.com|youtu\.be/i.test(g.YTube);
      if (hadYoutubeUrl && g.Image) {
        const oldFullPath = path.join(__dirname, g.Image.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldFullPath)) { try { fs.unlinkSync(oldFullPath); } catch (e) { console.error(e); } }
        const oldThumbPath = path.join(path.dirname(oldFullPath), 'thumbs', path.basename(oldFullPath));
        if (fs.existsSync(oldThumbPath)) { try { fs.unlinkSync(oldThumbPath); } catch (e) { console.error(e); } }
      }
      const postId = g.PostID;
      const galleryDir = path.join(__dirname, 'sitelib', 'posts', String(postId), 'gallery');
      const thumbsDir = path.join(galleryDir, 'thumbs');
      try {
        const thumbBuf = await fetchYouTubeThumbnail(videoId);
        const baseName = crypto.randomBytes(16).toString('hex') + '.webp';
        const outPath = path.join(galleryDir, baseName);
        const thumbPath = path.join(thumbsDir, baseName);
        if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
        if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
        await sharp(thumbBuf).rotate().resize(1920, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
        await sharp(thumbBuf).rotate().resize(300, null, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(thumbPath);
        imageRelPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
      } catch (e) {
        console.error('YouTube thumbnail fetch error:', e);
      }
    }
  }
  const newYTube = 'YTube' in req.body ? (YTube || null) : g.YTube;
  const newImage = keepExistingImage || newYTube === null ? g.Image : imageRelPath;
  galleries[idx] = { ...g, YTube: newYTube, Image: newImage };
  writeDb({ ...db, Galleries: galleries });
  res.json({ ok: true, item: galleries[idx] });
});

app.delete('/api/dashboard/galleries/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const galleries = [...(db.Galleries || [])];
  const idx = galleries.findIndex(g => g.GalleryID === id);
  if (idx < 0) return res.status(404).json({ error: 'Gallery item not found' });
  const imgPath = galleries[idx].Image;
  const videoPath = galleries[idx].Video;
  const ytubePath = galleries[idx].YTube;
  const isYtubeVideoPath = ytubePath && !/youtube\.com|youtu\.be/i.test(ytubePath) && /\.(mp4|webm|ogg|mov|avi|mkv|wmv|3gp)$/i.test(ytubePath);
  if (imgPath) {
    const fullPath = path.join(__dirname, imgPath.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) { try { fs.unlinkSync(fullPath); } catch (e) { console.error(e); } }
    const thumbPath = path.join(path.dirname(fullPath), 'thumbs', path.basename(fullPath));
    if (fs.existsSync(thumbPath)) { try { fs.unlinkSync(thumbPath); } catch (e) { console.error(e); } }
  }
  if (videoPath) {
    const fullPath = path.join(__dirname, videoPath.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) { try { fs.unlinkSync(fullPath); } catch (e) { console.error(e); } }
  }
  if (isYtubeVideoPath) {
    const fullPath = path.join(__dirname, ytubePath.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) { try { fs.unlinkSync(fullPath); } catch (e) { console.error(e); } }
  }
  galleries.splice(idx, 1);
  writeDb({ ...db, Galleries: galleries });
  res.json({ ok: true });
});

app.patch('/api/dashboard/posts/:id/gallery/reorder', requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const galleries = [...(db.Galleries || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const postGalleries = galleries.filter(g => g.PostID === postId);
    const reordered = order.map((gid, i) => {
      const g = postGalleries.find(x => x.GalleryID === parseInt(gid, 10));
      return g ? { ...g, Order: i + 1 } : null;
    }).filter(Boolean);
    const others = galleries.filter(g => g.PostID !== postId);
    const updated = galleries.filter(g => g.PostID === postId && !orderSet.has(g.GalleryID));
    const withOrder = [...others, ...reordered, ...updated].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Galleries: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Gallery reorder error:', e);
    res.status(500).json({ error: 'Failed to reorder gallery' });
  }
});

app.get('/api/dashboard/galleries', requireAuth, (req, res) => {
  const db = getCachedDb();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 15));
  const galleries = (db.Galleries || []).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  const total = galleries.length;
  const start = (page - 1) * pageSize;
  const items = galleries.slice(start, start + pageSize);
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 });
});

app.get('/api/dashboard/categories', requireAuth, (req, res) => {
  const db = getCachedDb();
  const items = (db.Categories || []).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  res.json({ items });
});

function categoryFilteredTitle(titleAr, titleEn) {
  const ar = (titleAr || '').trim();
  const en = (titleEn || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ar ? (ar + (en ? '-' + en : '')) : en || '';
}

const CATEGORIES_DIR = path.join(__dirname, 'sitelib', 'categories');

app.post('/api/dashboard/categories/upload', requireAuth, categoryUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file' });
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
  }
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(CATEGORIES_DIR, baseName + '.webp');
  try {
    if (!fs.existsSync(CATEGORIES_DIR)) fs.mkdirSync(CATEGORIES_DIR, { recursive: true });
    await sharp(req.file.buffer)
      .rotate()
      .resize(600, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    res.json({ ok: true, path: relPath });
  } catch (e) {
    console.error('Category image upload error:', e);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.delete('/api/dashboard/categories/:id/image', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const categories = [...(db.Categories || [])];
  const idx = categories.findIndex(c => c.CategoryID === id);
  if (idx < 0) return res.status(404).json({ error: 'Category not found' });
  const imgPath = categories[idx].Image;
  if (imgPath) {
    const fullPath = path.join(__dirname, imgPath.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.error('Delete image error:', e); }
    }
    categories[idx] = { ...categories[idx], Image: null };
    writeDb({ ...db, Categories: categories });
  }
  res.json({ ok: true });
});

app.post('/api/dashboard/categories', requireAuth, (req, res) => {
  const db = getCachedDb();
  const { TitleEn, TitleAr, Publish, Image } = req.body || {};
  const titleEn = sanitize(TitleEn || '', 200);
  const titleAr = sanitize(TitleAr || '', 200);
  if (!titleEn) return res.status(400).json({ error: 'Title (En) is required' });
  if (!titleAr) return res.status(400).json({ error: 'Title (Ar) is required' });
  const imagePath = Image ? sanitize(String(Image), 500) : null;
  if (!imagePath) return res.status(400).json({ error: 'Image is required' });
  const categories = [...(db.Categories || [])];
  const newId = getNextId(db, 'CategoryID');
  const maxOrder = categories.reduce((m, c) => Math.max(m, c.Order || 0), 0);
  const newCat = {
    CategoryID: newId,
    TitleEn: titleEn,
    TitleAr: titleAr,
    FilteredTitle: categoryFilteredTitle(titleAr, titleEn),
    Image: imagePath,
    Publish: Publish ? 1 : 0,
    Order: maxOrder + 1
  };
  categories.push(newCat);
  writeDb({ ...db, Categories: categories });
  res.json({ ok: true, item: newCat });
});

app.put('/api/dashboard/categories/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const { TitleEn, TitleAr, Publish, Image } = req.body || {};
  const categories = [...(db.Categories || [])];
  const idx = categories.findIndex(c => c.CategoryID === id);
  if (idx < 0) return res.status(404).json({ error: 'Category not found' });
  const titleEn = TitleEn !== undefined ? sanitize(String(TitleEn), 200) : categories[idx].TitleEn;
  const titleAr = TitleAr !== undefined ? sanitize(String(TitleAr), 200) : categories[idx].TitleAr;
  if (!titleEn) return res.status(400).json({ error: 'Title (En) is required' });
  if (!titleAr) return res.status(400).json({ error: 'Title (Ar) is required' });
  const newImage = Image !== undefined ? (Image === null || Image === '' ? null : sanitize(String(Image), 500) || null) : categories[idx].Image;
  if (!newImage) return res.status(400).json({ error: 'Image is required' });
  if (Image !== undefined && categories[idx].Image && categories[idx].Image !== newImage) {
    const oldPath = path.join(__dirname, (categories[idx].Image || '').replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (e) { console.error('Delete old image error:', e); }
    }
  }
  categories[idx] = {
    ...categories[idx],
    TitleEn: titleEn,
    TitleAr: titleAr,
    FilteredTitle: categoryFilteredTitle(titleAr, titleEn),
    Image: newImage,
    Publish: Publish !== undefined ? (Publish ? 1 : 0) : categories[idx].Publish
  };
  writeDb({ ...db, Categories: categories });
  res.json({ ok: true, item: categories[idx] });
});

app.delete('/api/dashboard/categories/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const categories = [...(db.Categories || [])];
  const idx = categories.findIndex(c => c.CategoryID === id);
  if (idx < 0) return res.status(404).json({ error: 'Category not found' });
  const imgPath = categories[idx].Image;
  if (imgPath) {
    const fullPath = path.join(__dirname, imgPath.replace(/^\//, '').replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.error('Delete category image error:', e); }
    }
  }
  categories.splice(idx, 1);
  writeDb({ ...db, Categories: categories });
  res.json({ ok: true });
});

app.patch('/api/dashboard/categories/reorder', requireAuth, (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const categories = [...(db.Categories || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const reordered = order.map((id, i) => {
      const c = categories.find(x => x.CategoryID === parseInt(id, 10));
      return c ? { ...c, Order: i + 1 } : null;
    }).filter(Boolean);
    const remaining = categories.filter(c => !orderSet.has(c.CategoryID)).map((c, i) => ({ ...c, Order: reordered.length + 1 + i }));
    const withOrder = [...reordered, ...remaining].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Categories: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error reordering categories:', e);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

app.get('/api/dashboard/cities', requireAuth, (req, res) => {
  const db = getCachedDb();
  const items = (db.Cities || []).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  const withParent = items.map(c => ({
    ...c,
    parentName: c.ParentID ? ((items.find(x => x.CityID === c.ParentID) || {}).TitleEn || '-') : '-'
  }));
  res.json({ items: withParent });
});

app.post('/api/dashboard/cities', requireAuth, (req, res) => {
  const db = getCachedDb();
  const { TitleEn, TitleAr, ParentID, Publish } = req.body || {};
  const titleEn = sanitize(TitleEn || '', 200);
  const titleAr = sanitize(TitleAr || '', 200);
  if (!titleEn) return res.status(400).json({ error: 'Title (En) is required' });
  if (!titleAr) return res.status(400).json({ error: 'Title (Ar) is required' });
  const cities = [...(db.Cities || [])];
  const newId = getNextId(db, 'CityID');
  const maxOrder = cities.reduce((m, c) => Math.max(m, c.Order || 0), 0);
  const parentId = ParentID != null && ParentID !== '' ? parseInt(ParentID, 10) : null;
  const newCity = {
    CityID: newId,
    TitleEn: titleEn,
    TitleAr: titleAr,
    ParentID: parentId,
    Publish: Publish ? 1 : 0,
    Order: maxOrder + 1
  };
  cities.push(newCity);
  writeDb({ ...db, Cities: cities });
  res.json({ ok: true, item: newCity });
});

app.put('/api/dashboard/cities/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const { TitleEn, TitleAr, ParentID, Publish } = req.body || {};
  const cities = [...(db.Cities || [])];
  const idx = cities.findIndex(c => c.CityID === id);
  if (idx < 0) return res.status(404).json({ error: 'City not found' });
  const titleEn = TitleEn !== undefined ? sanitize(String(TitleEn), 200) : cities[idx].TitleEn;
  const titleAr = TitleAr !== undefined ? sanitize(String(TitleAr), 200) : cities[idx].TitleAr;
  if (!titleEn) return res.status(400).json({ error: 'Title (En) is required' });
  if (!titleAr) return res.status(400).json({ error: 'Title (Ar) is required' });
  const parentId = ParentID !== undefined ? (ParentID != null && ParentID !== '' ? parseInt(ParentID, 10) : null) : cities[idx].ParentID;
  if (parentId === id) return res.status(400).json({ error: 'City cannot be its own parent' });
  cities[idx] = {
    ...cities[idx],
    TitleEn: titleEn,
    TitleAr: titleAr,
    ParentID: parentId,
    Publish: Publish !== undefined ? (Publish ? 1 : 0) : cities[idx].Publish
  };
  writeDb({ ...db, Cities: cities });
  res.json({ ok: true, item: cities[idx] });
});

app.delete('/api/dashboard/cities/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const cities = [...(db.Cities || [])];
  const idx = cities.findIndex(c => c.CityID === id);
  if (idx < 0) return res.status(404).json({ error: 'City not found' });
  const hasChildren = cities.some(c => c.ParentID === id);
  if (hasChildren) return res.status(400).json({ error: 'Cannot delete city with child cities. Remove or reassign children first.' });
  cities.splice(idx, 1);
  writeDb({ ...db, Cities: cities });
  res.json({ ok: true });
});

app.patch('/api/dashboard/cities/reorder', requireAuth, (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const cities = [...(db.Cities || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const reordered = order.map((id, i) => {
      const c = cities.find(x => x.CityID === parseInt(id, 10));
      return c ? { ...c, Order: i + 1 } : null;
    }).filter(Boolean);
    const remaining = cities.filter(c => !orderSet.has(c.CityID)).map((c, i) => ({ ...c, Order: reordered.length + 1 + i }));
    const withOrder = [...reordered, ...remaining].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Cities: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error reordering cities:', e);
    res.status(500).json({ error: 'Failed to reorder cities' });
  }
});

app.get('/api/dashboard/slides', requireAuth, (req, res) => {
  const db = getCachedDb();
  const items = (db.Slides || []).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  res.json({ items });
});

const SLIDES_BASE = path.join(__dirname, 'sitelib', 'slides');

app.post('/api/dashboard/slides', requireAuth, slideUpload.single('image'), async (req, res) => {
  const db = getCachedDb();
  const { TitleEn, TitleAr, Publish } = req.body || {};
  const titleEn = sanitize(TitleEn || '', 200);
  const titleAr = sanitize(TitleAr || '', 200);
  if (!req.file) return res.status(400).json({ error: 'Slide image is required' });
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
  }
  const slides = [...(db.Slides || [])];
  const newId = getNextId(db, 'SlideID');
  const slideDir = path.join(SLIDES_BASE, String(newId));
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(slideDir, baseName + '.webp');
  try {
    if (!fs.existsSync(slideDir)) fs.mkdirSync(slideDir, { recursive: true });
    await sharp(req.file.buffer)
      .rotate()
      .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const maxOrder = slides.reduce((m, s) => Math.max(m, s.Order || 0), 0);
    const newSlide = {
      SlideID: newId,
      Image: relPath,
      TitleEn: titleEn || null,
      TitleAr: titleAr || null,
      DescriptionEn: null,
      DescriptionAr: null,
      ContentEn: null,
      ContentAr: null,
      Publish: (Publish === true || Publish === 1 || Publish === 'true' || Publish === '1' || Publish === 'on') ? 1 : 0,
      Order: maxOrder + 1
    };
    slides.push(newSlide);
    writeDb({ ...db, Slides: slides });
    res.json({ ok: true, item: newSlide });
  } catch (e) {
    console.error('Slide create error:', e);
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

app.put('/api/dashboard/slides/:id', requireAuth, slideUpload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const { TitleEn, TitleAr, Publish } = req.body || {};
  const slides = [...(db.Slides || [])];
  const idx = slides.findIndex(s => s.SlideID === id);
  if (idx < 0) return res.status(404).json({ error: 'Slide not found' });
  const titleEn = TitleEn !== undefined ? sanitize(String(TitleEn), 200) : slides[idx].TitleEn;
  const titleAr = TitleAr !== undefined ? sanitize(String(TitleAr), 200) : slides[idx].TitleAr;
  let imagePath = slides[idx].Image;
  if (req.file) {
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
    }
    const slideDir = path.join(SLIDES_BASE, String(id));
    const baseName = crypto.randomBytes(16).toString('hex');
    const outPath = path.join(slideDir, baseName + '.webp');
    try {
      if (!fs.existsSync(slideDir)) fs.mkdirSync(slideDir, { recursive: true });
      await sharp(req.file.buffer)
        .rotate()
        .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outPath);
      const oldPath = slides[idx].Image;
      if (oldPath) {
        const oldFull = path.join(__dirname, oldPath.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldFull)) { try { fs.unlinkSync(oldFull); } catch (e) { console.error(e); } }
      }
      imagePath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    } catch (e) {
      console.error('Slide image update error:', e);
      return res.status(500).json({ error: 'Failed to process image' });
    }
  }
  slides[idx] = {
    ...slides[idx],
    Image: imagePath,
    TitleEn: titleEn,
    TitleAr: titleAr,
    Publish: Publish !== undefined ? ((Publish === true || Publish === 1 || Publish === 'true' || Publish === '1' || Publish === 'on') ? 1 : 0) : slides[idx].Publish
  };
  writeDb({ ...db, Slides: slides });
  res.json({ ok: true, item: slides[idx] });
});

app.delete('/api/dashboard/slides/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const slides = [...(db.Slides || [])];
  const idx = slides.findIndex(s => s.SlideID === id);
  if (idx < 0) return res.status(404).json({ error: 'Slide not found' });
  const slideDir = path.join(SLIDES_BASE, String(id));
  if (fs.existsSync(slideDir)) {
    try { fs.rmSync(slideDir, { recursive: true }); } catch (e) { console.error('Delete slide folder error:', e); }
  }
  slides.splice(idx, 1);
  writeDb({ ...db, Slides: slides });
  res.json({ ok: true });
});

app.patch('/api/dashboard/slides/reorder', requireAuth, (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const slides = [...(db.Slides || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const reordered = order.map((id, i) => {
      const s = slides.find(x => x.SlideID === parseInt(id, 10));
      return s ? { ...s, Order: i + 1 } : null;
    }).filter(Boolean);
    const remaining = slides.filter(s => !orderSet.has(s.SlideID)).map((s, i) => ({ ...s, Order: reordered.length + 1 + i }));
    const withOrder = [...reordered, ...remaining].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Slides: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error reordering slides:', e);
    res.status(500).json({ error: 'Failed to reorder slides' });
  }
});

app.get('/api/dashboard/testimonials', requireAuth, (req, res) => {
  const db = getCachedDb();
  const items = (db.Testimonials || []).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  res.json({ items });
});

const TESTIMONIALS_BASE = path.join(__dirname, 'sitelib', 'testimonials');

app.post('/api/dashboard/testimonials', requireAuth, testimonialUpload.single('image'), async (req, res) => {
  const db = getCachedDb();
  const { NameEn, NameAr, ContentEn, ContentAr, Publish } = req.body || {};
  const nameEn = sanitize(NameEn || '', 200);
  const nameAr = sanitize(NameAr || '', 200);
  const contentEn = sanitize(ContentEn || '', 2000);
  const contentAr = sanitize(ContentAr || '', 2000);
  if (!req.file) return res.status(400).json({ error: 'Testimonial image is required' });
  if (!nameEn) return res.status(400).json({ error: 'Name (En) is required' });
  if (!nameAr) return res.status(400).json({ error: 'Name (Ar) is required' });
  if (!contentEn) return res.status(400).json({ error: 'Content (En) is required' });
  if (!contentAr) return res.status(400).json({ error: 'Content (Ar) is required' });
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
  }
  const testimonials = [...(db.Testimonials || [])];
  const newId = getNextId(db, 'TID');
  const testDir = path.join(TESTIMONIALS_BASE, String(newId));
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(testDir, baseName + '.webp');
  try {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    await sharp(req.file.buffer)
      .rotate()
      .resize(300, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const maxOrder = testimonials.reduce((m, t) => Math.max(m, t.Order || 0), 0);
    const newTest = {
      TID: newId,
      Image: relPath,
      NameEn: nameEn,
      NameAr: nameAr,
      ContentEn: contentEn,
      ContentAr: contentAr,
      Publish: (Publish === true || Publish === 1 || Publish === 'true' || Publish === '1' || Publish === 'on') ? 1 : 0,
      Order: maxOrder + 1
    };
    testimonials.push(newTest);
    writeDb({ ...db, Testimonials: testimonials });
    res.json({ ok: true, item: newTest });
  } catch (e) {
    console.error('Testimonial create error:', e);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

app.put('/api/dashboard/testimonials/:id', requireAuth, testimonialUpload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const { NameEn, NameAr, ContentEn, ContentAr, Publish } = req.body || {};
  const testimonials = [...(db.Testimonials || [])];
  const idx = testimonials.findIndex(t => t.TID === id);
  if (idx < 0) return res.status(404).json({ error: 'Testimonial not found' });
  const nameEn = NameEn !== undefined ? sanitize(String(NameEn), 200) : testimonials[idx].NameEn;
  const nameAr = NameAr !== undefined ? sanitize(String(NameAr), 200) : testimonials[idx].NameAr;
  const contentEn = ContentEn !== undefined ? sanitize(String(ContentEn), 2000) : testimonials[idx].ContentEn;
  const contentAr = ContentAr !== undefined ? sanitize(String(ContentAr), 2000) : testimonials[idx].ContentAr;
  if (!nameEn) return res.status(400).json({ error: 'Name (En) is required' });
  if (!nameAr) return res.status(400).json({ error: 'Name (Ar) is required' });
  if (!contentEn) return res.status(400).json({ error: 'Content (En) is required' });
  if (!contentAr) return res.status(400).json({ error: 'Content (Ar) is required' });
  let imagePath = testimonials[idx].Image;
  if (req.file) {
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
    }
    const testDir = path.join(TESTIMONIALS_BASE, String(id));
    const baseName = crypto.randomBytes(16).toString('hex');
    const outPath = path.join(testDir, baseName + '.webp');
    try {
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      await sharp(req.file.buffer)
        .rotate()
        .resize(300, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outPath);
      const oldPath = testimonials[idx].Image;
      if (oldPath) {
        const oldFull = path.join(__dirname, oldPath.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldFull)) { try { fs.unlinkSync(oldFull); } catch (e) { console.error(e); } }
      }
      imagePath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    } catch (e) {
      console.error('Testimonial image update error:', e);
      return res.status(500).json({ error: 'Failed to process image' });
    }
  }
  if (!imagePath) return res.status(400).json({ error: 'Image is required' });
  testimonials[idx] = {
    ...testimonials[idx],
    Image: imagePath,
    NameEn: nameEn,
    NameAr: nameAr,
    ContentEn: contentEn,
    ContentAr: contentAr,
    Publish: Publish !== undefined ? ((Publish === true || Publish === 1 || Publish === 'true' || Publish === '1' || Publish === 'on') ? 1 : 0) : testimonials[idx].Publish
  };
  writeDb({ ...db, Testimonials: testimonials });
  res.json({ ok: true, item: testimonials[idx] });
});

app.delete('/api/dashboard/testimonials/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const testimonials = [...(db.Testimonials || [])];
  const idx = testimonials.findIndex(t => t.TID === id);
  if (idx < 0) return res.status(404).json({ error: 'Testimonial not found' });
  const testDir = path.join(TESTIMONIALS_BASE, String(id));
  if (fs.existsSync(testDir)) {
    try { fs.rmSync(testDir, { recursive: true }); } catch (e) { console.error('Delete testimonial folder error:', e); }
  }
  testimonials.splice(idx, 1);
  writeDb({ ...db, Testimonials: testimonials });
  res.json({ ok: true });
});

app.patch('/api/dashboard/testimonials/reorder', requireAuth, (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const testimonials = [...(db.Testimonials || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const reordered = order.map((id, i) => {
      const t = testimonials.find(x => x.TID === parseInt(id, 10));
      return t ? { ...t, Order: i + 1 } : null;
    }).filter(Boolean);
    const remaining = testimonials.filter(t => !orderSet.has(t.TID)).map((t, i) => ({ ...t, Order: reordered.length + 1 + i }));
    const withOrder = [...reordered, ...remaining].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Testimonials: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error reordering testimonials:', e);
    res.status(500).json({ error: 'Failed to reorder testimonials' });
  }
});

const USERS_BASE = path.join(__dirname, 'sitelib', 'users');
const VALID_ROLES = ['admin', 'editor'];

app.get('/api/dashboard/users', requireAuth, (req, res) => {
  const db = getCachedDb();
  const users = (db.Users || []).sort((a, b) => (a.Order || 0) - (b.Order || 0));
  res.json({ items: users });
});

app.post('/api/dashboard/users', requireAuth, requireAdmin, userUpload.single('image'), async (req, res) => {
  const db = getCachedDb();
  const { Name, Username, Email, Role } = req.body || {};
  const name = sanitize(Name || '', 200);
  const username = sanitize(Username || '', 100);
  const email = (Email || '').toLowerCase().trim();
  const role = (Role || '').toLowerCase();
  if (!req.file) return res.status(400).json({ error: 'User image is required' });
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!username) return res.status(400).json({ error: 'Username is required' });
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Role must be admin or editor' });
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
  }
  const users = [...(db.Users || [])];
  const exists = users.some(u => (u.Email || '').toLowerCase() === email);
  if (exists) return res.status(400).json({ error: 'Email already registered' });
  const newId = getNextId(db, 'UserID');
  const userDir = path.join(USERS_BASE, String(newId));
  const baseName = crypto.randomBytes(16).toString('hex');
  const outPath = path.join(userDir, baseName + '.webp');
  try {
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    await sharp(req.file.buffer)
      .rotate()
      .resize(300, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);
    const relPath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    const maxOrder = users.reduce((m, u) => Math.max(m, u.Order || 0), 0);
    const newUser = { UserID: newId, Name: name, Username: username, Email: email, Role: role, Image: relPath, Order: maxOrder + 1 };
    users.push(newUser);
    writeDb({ ...db, Users: users });
    res.json({ ok: true, item: newUser });
  } catch (e) {
    console.error('User create error:', e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/dashboard/users/:id', requireAuth, requireAdmin, userUpload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const { Name, Username, Email, Role } = req.body || {};
  const users = [...(db.Users || [])];
  const idx = users.findIndex(u => u.UserID === id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  const name = Name !== undefined ? sanitize(String(Name), 200) : users[idx].Name;
  const username = Username !== undefined ? sanitize(String(Username), 100) : users[idx].Username;
  const email = Email !== undefined ? (String(Email || '').toLowerCase().trim()) : users[idx].Email;
  const role = Role !== undefined ? (String(Role || '').toLowerCase()) : users[idx].Role;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!username) return res.status(400).json({ error: 'Username is required' });
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Role must be admin or editor' });
  if (email !== (users[idx].Email || '').toLowerCase()) {
    const exists = users.some(u => u.UserID !== id && (u.Email || '').toLowerCase() === email);
    if (exists) return res.status(400).json({ error: 'Email already registered' });
  }
  let imagePath = users[idx].Image;
  if (req.file) {
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
    }
    const userDir = path.join(USERS_BASE, String(id));
    const baseName = crypto.randomBytes(16).toString('hex');
    const outPath = path.join(userDir, baseName + '.webp');
    try {
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      await sharp(req.file.buffer)
        .rotate()
        .resize(300, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outPath);
      const oldPath = users[idx].Image;
      if (oldPath) {
        const oldFull = path.join(__dirname, oldPath.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldFull)) { try { fs.unlinkSync(oldFull); } catch (e) { console.error(e); } }
      }
      imagePath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    } catch (e) {
      console.error('User image update error:', e);
      return res.status(500).json({ error: 'Failed to process image' });
    }
  }
  if (!imagePath) return res.status(400).json({ error: 'Image is required' });
  users[idx] = { ...users[idx], Name: name, Username: username, Email: email, Role: role, Image: imagePath };
  writeDb({ ...db, Users: users });
  res.json({ ok: true, item: users[idx] });
});

app.delete('/api/dashboard/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const users = [...(db.Users || [])];
  const idx = users.findIndex(u => u.UserID === id);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  const userDir = path.join(USERS_BASE, String(id));
  if (fs.existsSync(userDir)) {
    try { fs.rmSync(userDir, { recursive: true }); } catch (e) { console.error('Delete user folder error:', e); }
  }
  users.splice(idx, 1);
  writeDb({ ...db, Users: users });
  res.json({ ok: true });
});

app.patch('/api/dashboard/users/reorder', requireAuth, requireAdmin, (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: 'order array required' });
    const db = getCachedDb();
    const users = [...(db.Users || [])];
    const orderSet = new Set(order.map(id => parseInt(id, 10)));
    const reordered = order.map((id, i) => {
      const u = users.find(x => x.UserID === parseInt(id, 10));
      return u ? { ...u, Order: i + 1 } : null;
    }).filter(Boolean);
    const remaining = users.filter(u => !orderSet.has(u.UserID)).map((u, i) => ({ ...u, Order: reordered.length + 1 + i }));
    const withOrder = [...reordered, ...remaining].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    writeDb({ ...db, Users: withOrder });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error reordering users:', e);
    res.status(500).json({ error: 'Failed to reorder users' });
  }
});

app.put('/api/dashboard/profile', requireAuth, userUpload.single('image'), async (req, res) => {
  const currentUserId = parseInt(req.user?.id, 10);
  if (!currentUserId) return res.status(401).json({ error: 'Not authenticated' });
  const db = getCachedDb();
  const users = [...(db.Users || [])];
  const idx = users.findIndex(u => u.UserID === currentUserId);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  const isAdmin = (req.user?.role || '').toLowerCase() === 'admin';
  const { Name, Email, Role } = req.body || {};
  const name = Name !== undefined ? sanitize(String(Name), 200) : users[idx].Name;
  let email = users[idx].Email;
  let role = users[idx].Role;
  if (isAdmin) {
    if (Email !== undefined) email = (String(Email || '').toLowerCase().trim());
    if (Role !== undefined) {
      const r = (String(Role || '').toLowerCase());
      if (VALID_ROLES.includes(r)) role = r;
    }
  }
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (email !== (users[idx].Email || '').toLowerCase()) {
    const exists = users.some(u => u.UserID !== currentUserId && (u.Email || '').toLowerCase() === email);
    if (exists) return res.status(400).json({ error: 'Email already registered' });
  }
  let imagePath = users[idx].Image;
  if (req.file) {
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, GIF or WebP.' });
    }
    const userDir = path.join(USERS_BASE, String(currentUserId));
    const baseName = crypto.randomBytes(16).toString('hex');
    const outPath = path.join(userDir, baseName + '.webp');
    try {
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      await sharp(req.file.buffer)
        .rotate()
        .resize(300, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outPath);
      const oldPath = users[idx].Image;
      if (oldPath) {
        const oldFull = path.join(__dirname, oldPath.replace(/^\//, '').replace(/\//g, path.sep));
        if (fs.existsSync(oldFull)) { try { fs.unlinkSync(oldFull); } catch (e) { console.error(e); } }
      }
      imagePath = path.relative(__dirname, outPath).replace(/\\/g, '/');
    } catch (e) {
      console.error('Profile image update error:', e);
      return res.status(500).json({ error: 'Failed to process image' });
    }
  }
  if (!imagePath) return res.status(400).json({ error: 'Image is required' });
  users[idx] = { ...users[idx], Name: name, Email: email, Role: role, Image: imagePath };
  writeDb({ ...db, Users: users });
  const imgPath = users[idx].Image ? '/' + users[idx].Image.replace(/^\/+/, '') : '';
  const updatedUser = { id: users[idx].UserID, email: users[idx].Email, name: users[idx].Name, picture: imgPath, role: users[idx].Role };
  req.login(updatedUser, function (err) {
    if (err) console.error('Profile session update error:', err);
    res.json({ ok: true, item: users[idx], user: updatedUser });
  });
});

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  reloadDbCache();
}

app.delete('/api/dashboard/posts/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const db = getCachedDb();
  const posts = [...(db.Posts || [])];
  const idx = posts.findIndex(p => p.PostID === id);
  if (idx < 0) return res.status(404).json({ error: 'Post not found' });
  const post = posts[idx];
  const postDir = path.join(__dirname, 'sitelib', 'posts', String(id));
  if (fs.existsSync(postDir)) {
    try {
      fs.rmSync(postDir, { recursive: true });
    } catch (e) { console.error('Delete post folder error:', e); }
  }
  posts.splice(idx, 1);
  const galleries = (db.Galleries || []).filter(g => g.PostID !== id);
  writeDb({ ...db, Posts: posts, Galleries: galleries });
  res.json({ ok: true });
});

// Dashboard & Google Auth
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/callback',
  passport.authenticate('google', { failureRedirect: '/?error=unauthorized' }),
  (req, res) => res.redirect('/dashboard')
);
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    res.redirect('/');
  });
});

app.get('/api/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ user: req.user });
  }
  return res.json({ user: {
      id: '1',
      email: 'albzoor80@gmail.com',
      name: 'Hasan Albzoor',
      picture: 'sitelib/users/1/c9cb13ff662844898a55c8a371134e1c.jpg',
      role: 'admin'
    }
  });
  //return res.json({ error: 'Not authenticated' });
});

// 404 - Page Not Found (catch-all for unmatched routes)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Error handler for 500 and other server errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.redirect(302, '/404?code=500');
  }
});

const useHttpsDev = process.env.USE_HTTPS === '1' && !isProd;

if (useHttpsDev) {
  const SSL_CERT = fs.readFileSync(path.resolve(__dirname, './ssl/cert.pem'));
  const SSL_KEY = fs.readFileSync(path.resolve(__dirname, './ssl/key.pem'));
  const server = https.createServer(
    {
      key: SSL_KEY,
      cert: SSL_CERT
    },
    app
  );
  server.listen(PORT, () => {
    console.log(`Istaqim server running at https://localhost:${PORT} (dev HTTPS)`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Istaqim server running at http://localhost:${PORT}`);
  });
}
