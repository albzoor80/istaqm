# Istaqim - Design & Decoration Website

A modern, responsive, multilingual Node.js website for Istaqim design and decoration services.

## Features

- **Bootstrap 5.3** - Modern responsive layout
- **Multilingual** - Arabic (default) and English with RTL/LTR support
- **Dynamic Content** - Loaded from `database.json`
- **Visitor Tracking** - Countries stored in `Countries.xml`, count displayed on main page
- **Story Gallery** - Facebook-style story viewer for project images and videos
- **Responsive** - Optimized for mobile, tablet, and desktop

## Project Structure

```
istaqm_node/
├── server.js          # Express server
├── database.json      # Dynamic content (categories, slides, testimonials, gallery)
├── Countries.xml      # Visitor counts by country
├── css/site.css       # Styles (theme + Bootstrap 5 layout)
├── js/gallery_story.js # Story viewer (images, videos, YouTube)
├── images/            # Theme images
├── sitelib/           # Content images (slides, categories, posts, testimonials)
│   ├── slides/
│   ├── categories/
│   ├── posts/
│   └── testimonials/
└── views/
    └── index.html     # Page template
```

## Run

```bash
npm install
npm start
```

Visit http://localhost:3000

## Language

- Default: Arabic (`/` or `/?lang=ar`)
- English: `/?lang=en` or `/en`

## API

- `GET /api/data` - Full database JSON
- `GET /api/stats` - Visitor stats (total visits, top countries)
- `POST /api/record-visit` - Record a visit (geoip-lite resolves IP to country, increments visitorsCount in Countries.xml)
- `GET /dashboard` - Admin dashboard (Google login required)
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback

## Dashboard (Google Login)

1. Add to `.env`:
   - `GoogleClient_Id` - From Google Cloud Console
   - `GoogleClient_Secret` - From Google Cloud Console
   - `BASE_URL` - e.g. `http://localhost:5006` or `https://istaqimdesign.com`
   - `SESSION_SECRET` - Random string for session encryption

2. In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials:
   - Add **Authorized redirect URIs**: `{BASE_URL}/callback` (e.g. `https://localhost:5006/callback` or `https://istaqimdesign.com/callback`)

3. Visit `/dashboard` to sign in with Google.

## Credits

- Developed by Nowaty
- Istaqim Design - Design & Decoration Services
