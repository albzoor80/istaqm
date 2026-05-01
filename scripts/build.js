/**
 * Production build script - creates a "build" folder with minified JS/CSS
 * Run: npm run build
 */
const fs = require('fs');
const path = require('path');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');

const JS_FILES = [
  'js/site.js',
  'js/gallery_story.js',
  'js/projects.js',
  'js/contact.js',
  'js/about.js',
  'js/error-page.js',
  'js/dashboard.js'
];

const CSS_FILES = [
  'css/site.css',
  'css/dashboard.css'
];

const HTML_FILES = [
  'index.html',
  'projects.html',
  'about_us.html',
  'contact_us.html',
  'dashboard.html',
  '404.html'
];

const COPY_FILES = [
  'server.js',
  'package.json',
  'database.json',
  'sitemap.xml',
  'robots.txt'
];

const COPY_DIRS = ['images', 'sitelib'];

// Optional files (copy if exist)
const OPTIONAL_FILES = ['Countries.xml', '.env'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function minifyJavaScript(srcPath, destPath) {
  const code = fs.readFileSync(srcPath, 'utf8');
  const result = await minifyJs(code, {
    compress: { passes: 1 },
    mangle: true,
    format: { comments: false }
  });
  if (result.error) throw result.error;
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, result.code, 'utf8');
}

function minifyCss(srcPath, destPath) {
  const css = fs.readFileSync(srcPath, 'utf8');
  const result = new CleanCSS({ level: 2 }).minify(css);
  if (result.errors.length) throw new Error(result.errors.join('; '));
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, result.styles, 'utf8');
}

function updateHtmlForProduction(html) {
  return html
    .replace(/\/js\/([a-z_]+)\.js/g, '/js/$1.min.js')
    .replace(/\/css\/([a-z_]+)\.css/g, '/css/$1.min.css');
}

async function build() {
  console.log('Building production bundle...\n');

  if (fs.existsSync(BUILD)) {
    fs.rmSync(BUILD, { recursive: true });
  }
  ensureDir(BUILD);

  // Minify JS
  console.log('Minifying JavaScript...');
  for (const file of JS_FILES) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) {
      console.warn('  Skip (not found):', file);
      continue;
    }
    const dest = path.join(BUILD, file.replace(/\.js$/, '.min.js'));
    await minifyJavaScript(src, dest);
    console.log('  ', file, '->', path.relative(BUILD, dest));
  }

  // Minify CSS
  console.log('\nMinifying CSS...');
  for (const file of CSS_FILES) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) {
      console.warn('  Skip (not found):', file);
      continue;
    }
    const dest = path.join(BUILD, file.replace(/\.css$/, '.min.css'));
    minifyCss(src, dest);
    console.log('  ', file, '->', path.relative(BUILD, dest));
  }

  // Copy and update HTML
  console.log('\nProcessing HTML...');
  for (const file of HTML_FILES) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) {
      console.warn('  Skip (not found):', file);
      continue;
    }
    let html = fs.readFileSync(src, 'utf8');
    html = updateHtmlForProduction(html);
    fs.writeFileSync(path.join(BUILD, file), html, 'utf8');
    console.log('  ', file);
  }

  // Copy static files
  console.log('\nCopying files...');
  for (const file of COPY_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(BUILD, file));
      console.log('  ', file);
    }
  }

  // Copy optional files
  for (const file of OPTIONAL_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(BUILD, file));
      console.log('  ', file);
    }
  }

  // Copy directories
  for (const dir of COPY_DIRS) {
    const src = path.join(ROOT, dir);
    if (fs.existsSync(src)) {
      copyDir(src, path.join(BUILD, dir));
      console.log('  ', dir + '/');
    }
  }

  // Copy ssl if exists
  const sslDir = path.join(ROOT, 'ssl');
  if (fs.existsSync(sslDir)) {
    copyDir(sslDir, path.join(BUILD, 'ssl'));
    console.log('  ssl/');
  }

  // Copy views if exists
  const viewsDir = path.join(ROOT, 'views');
  if (fs.existsSync(viewsDir)) {
    copyDir(viewsDir, path.join(BUILD, 'views'));
    console.log('  views/');
  }

  console.log('\nBuild complete. Output: build/');
  console.log('\nTo run in production:');
  console.log('  cd build && npm install --production && node server.js');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
