# Chaitanya 2k26 — Annual Tech & Cultural Fest

Official web platform for **Chaitanya 2k26**, the annual flagship technical and cultural fest of **Himachal Pradesh Technical University (HPTU Hamirpur)**.

An immersive, futuristic digital experience combining cutting-edge WebGL 3D graphics, physics simulations, soundscapes, participant event registrations, a dedicated **Events Arena (`/events`)** with **Scroll Motion UI**, and a live multi-tab **Admin Command Center with Excel Export**.

---

## Key Highlights

- **Immersive 3D Experience**: Powered by Three.js and Cannon-es with real-time physics, glass shattering animations, and scroll-driven interactive 3D camera choreography.
- **Dedicated Events Arena (`/events`)**: 20 events across Coding & Tech, Design & Innovation, Business & Debate, Esports, and Cultural & Fun with real-time category filtering and instant fuzzy search.
- **Fluid Scroll Motion UI**:
  - Top edge gradient scroll progress bar (`0%` to `100%`).
  - Sticky category toolbar with frosted glass morphing dock.
  - Floating brutalist scroll HUD with dynamic progress metric and 1-click smooth return to top.
  - GPU-accelerated staggered card reveals on scroll and interactive 3D perspective tilt on hover.
- **Interactive Rules Dossier Drawer**: Slides out from the right displaying official competition rules, multi-round schedules, weighted judging rubrics, and direct Call & WhatsApp student/faculty coordinators.
- **Team & Solo Registration with UPI payments**:
  - Team leaders create a team (and pay the team fee) and get a team code (e.g. `BYTE-4F8K`); teammates join with the code.
  - Paid events take a 12-digit UPI UTR. Payments stay **pending** until an admin verifies the UTR against the bank statement.
  - Entry pass with a stable Pass ID and live payment status (pending / verified / rejected, with UTR resubmission).
  - Paid registrations stay closed until a verified UPI ID is set in `_nuxt/fest-config.js`.
- **Admin Command Center** (live Firestore data only):
  - **Payments**: verification queue with approve / reject, duplicate-UTR and wrong-amount flags.
  - **Registrations**: every entry with its effective payment state; paid events without a verified payment show **UNPAID**.
  - **Teams** and **Accounts** tabs, plus **Setup** to sync the event catalog (with fees) to Firestore.
  - Excel (`.xls`) export of all sheets and CSV export of the current tab (formula-injection safe).
- **Google Firebase Integration**: Dual-tier Google Sign-In, profile management, and attendee event registration with local caching and Cloud Firestore sync.
- **Brutalist Glassmorphism UI**: High-contrast, minimalist daytime design language featuring `DrukMedium` display headers and `IBM Plex Mono` monospace typography.

---

## Project Structure

```
chaitanya-2k26/
├── index.html                  # Single-page application entry point & SSR headers
├── server.py                   # Multi-threaded local dev server with MIME & CORS support
├── package.json                # Project metadata, deployment scripts & repository info
├── vercel.json                 # Vercel SPA routing configuration
├── netlify.toml                # Netlify SPA redirect rules
├── FIREBASE_SETUP.md           # Guide for configuring Google Auth and Cloud Firestore
│
├── _nuxt/                      # Application runtime, components, and styles
│   ├── app-main.js             # WebGL orchestrator, Three.js scene, router & audio
│   ├── home-scene-3d.js        # Main 3D canvas, Cannon physics & preloader
│   ├── events-page-view.js     # Vue 3 component for the /events route
│   ├── events-page.js          # Events Arena controller, search, filters & scroll motion
│   ├── events-data.js          # Dataset for all 20 events, rules, rounds & coordinators
│   ├── events.css              # Glassmorphic brutalist styles, drawer, modal & scroll HUD
│   ├── auth-modal.js           # Multi-tab Admin Panel, User Profile & Sign-In modals
│   ├── auth-modal.css          # Frosted glass authentication & admin styling
│   ├── auth-service.js         # Firebase Auth, team generation, Firestore sync & caching
│   ├── firebase-config.js      # Firebase SDK project credentials
│   ├── contact-interactive.js  # Contact page interactive form & 3D heart
│   ├── lil-gui-customizer.js   # Real-time shader material editor
│   ├── nuxt-router-utils.js    # Client-side routing & navigation bar
│   ├── DrukMedium.otf          # Display title typography
│   └── IBMPlexMono.ttf         # Monospace metadata typography
│
├── fonts/                      # 3D Three.js FontLoader JSON geometries
├── hdri/                       # High dynamic range environment reflections
├── images/                     # SVG icons, badges, UI elements and patterns
├── models/                     # 3D GLB/GLTF assets & Draco decompression wasm
└── textures/                   # PBR material textures & bump maps
```

---

## Fest configuration (edit before launch)

All fest-wide values live in [`_nuxt/fest-config.js`](_nuxt/fest-config.js):

| Setting | Meaning |
| --- | --- |
| `datesLabel` | Official dates, e.g. `"10 – 11 OCTOBER 2026"`. `null` shows "DATES TBA". |
| `upiId` | Verified UPI ID for collecting fees. `null` keeps paid registrations closed. |
| `upiQrImage` | Optional path to the bank-issued QR image. |
| `contactEmail` | Shown wherever no coordinator is listed. |

Event details (venues, times, fees, prizes, coordinators) are in [`_nuxt/events-data.js`](_nuxt/events-data.js); they are provisional placeholders until the committee confirms them. After editing, regenerate `events_catalog.json` and re-run **Admin → Setup → Sync** so the security rules see the new fees.

### Launch checklist

1. Set `datesLabel`, `upiId` (and optionally `upiQrImage`) in `fest-config.js`.
2. Replace placeholder event details and add real coordinators in `events-data.js`.
3. Deploy the security rules: `npm run deploy:rules`.
4. Sign in as an admin and run **Admin → Setup → Sync events & FAQs**.
5. Keep the admin list in `firebase-config.js` and `firestore.rules` identical.

## Getting Started

### Prerequisites

- Python 3.8+ (for local development server)
- Modern web browser with WebGL 2.0 support (Chrome, Edge, Firefox, Safari)

### Run Locally

1. Clone or navigate to the project directory:
   ```bash
   git clone https://github.com/scarescream27/chaitainya-front-back.git
   cd chaitainya-front-back
   ```

2. Start the local multi-threaded development server:
   ```bash
   python server.py
   ```

3. Open your browser and navigate to:
   - **Home (3D WebGL Scene)**: `http://localhost:3000`
   - **Events & Competitions Arena**: `http://localhost:3000/events`

---

## Admin Command Center

Admins are the Google accounts listed in `isAdmin()` in `firestore.rules` (the UI list in `_nuxt/firebase-config.js` must match). The **Admin** nav link appears only for those accounts.
1. Sign in, then open **Admin** from the navigation or your profile.
2. In **Payments**, check each UTR against the bank statement, then **Approve** or **Reject** (with a reason the participant sees).
3. Use **Registrations** at the gate: anything marked **UNPAID** has no verified payment.
4. **Download Excel** for the full database.

---

## Redis & High-Speed Caching

Chaitanya 2k26 includes an integrated multi-tiered Redis caching architecture designed to accelerate asset delivery (3D models, audio, textures, Draco wasm) and dynamic datasets with sub-millisecond response times and >98% cache hit ratios.

### 5-Tier Acceleration Architecture

1. **Layer 1: Browser Immutable Cache**: 3D GLB models, textures, audio, and fonts are served with `Cache-Control: public, max-age=31536000, immutable` (0ms client reloads).
2. **Layer 2: SHA-256 ETag & HTTP 304 Validation**: HTML and script files support `If-None-Match` revalidation, resulting in HTTP 304 Not Modified responses with 0 bytes transferred over the network.
3. **Layer 3: Redis RAM Cache**: Static files up to 25MB are stored directly in Redis RAM and served immediately with `X-Cache: HIT (Redis)` headers, bypassing disk I/O.
4. **Layer 4: Dynamic API Cache**: JSON endpoints like `/api/events` and `/api/cache/stats` are cached in Redis with configurable TTL (default 5–10 min).
5. **Layer 5: Gzip Compression Cache**: Text, JS, CSS, JSON, and SVG assets are pre-compressed and cached in Redis, reducing transfer size by 70–80%.

### Running with Redis

1. **Option A: Built-in Zero-Dependency Redis Server** (Default for Windows):
   ```bash
   npm run redis
   # Or: python scripts/redis_dev_server.py
   ```

2. **Option B: Docker / Native Redis**:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **Option C: Remote / Cloud Redis (Upstash, AWS ElastiCache, Redis Cloud)**:
   Add your connection string in `.env`:
   ```bash
   REDIS_URL=rediss://default:password@your-endpoint.upstash.io:6379
   ```

> The Python server is for **local development only**. It listens on `127.0.0.1` by default (set `HOST=0.0.0.0` to expose it on your LAN), refuses dotfiles and source files, and only accepts cache purges from localhost. Production is static hosting (Firebase), where none of the `/api/*` endpoints exist.

> **Zero-Downtime Fallback**: If Redis is offline or stopped, the server automatically and transparently falls back to an internal thread-safe LRU in-memory cache without dropping a single request!

### Cache Commands & Telemetry

- **Run Benchmark & Validation**:
  ```bash
  npm run cache:test
  ```
- **Inspect Live Cache Stats**:
  `GET http://localhost:3000/api/cache/stats`
- **Purge Redis Cache**:
  `POST http://localhost:3000/api/cache/purge` or 1-click inside the **Admin Command Center > [ ⚡ 05. REDIS ACCELERATION ]** tab.

---

## Authentication & Registrations

Firebase integration is pre-configured for Google Sign-In and Firestore attendee registration.
To configure custom credentials or set up your own Firebase project, follow the step-by-step instructions in [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

---

## Deployment

The project is structured as a static Single Page Application (SPA) and can be deployed directly to:
- **Vercel**: Run `vercel` from the root directory.
- **Netlify**: Drag-and-drop the root directory or connect your repository.
- **GitHub Pages**: Configure GitHub Pages to serve from the `main` branch root.

---

## License & University Branding

© 2026 Himachal Pradesh Technical University (HPTU Hamirpur). All rights reserved.  
Official Fest Contact: [chaitanyahptu@gmail.com](mailto:chaitanyahptu@gmail.com)
