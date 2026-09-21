# Chaitanya 2k26 — Annual Tech & Cultural Fest

Official web platform for **Chaitanya 2k26**, the annual flagship technical and cultural fest of **Himachal Pradesh Technical University (HPTU Hamirpur)**.

An immersive, futuristic digital experience combining cutting-edge WebGL 3D graphics, physics simulations, soundscapes, participant event registrations, a dedicated **Events Arena (`/events`)** with **Scroll Motion UI**, and a live multi-tab **Admin Command Center with Excel Export**.

---

## Key Highlights

- **Immersive 3D Experience**: Powered by Three.js and Cannon-es with real-time physics, glass shattering animations, and scroll-driven interactive 3D camera choreography.
- **Dedicated Events Arena (`/events`)**: 12 flagship competitions across Coding & AI, Robotics & IoT, Esports, Workshops, and Cultural Arts with real-time category filtering and instant fuzzy search.
- **Fluid Scroll Motion UI**:
  - Top edge gradient scroll progress bar (`0%` to `100%`).
  - Sticky category toolbar with frosted glass morphing dock.
  - Floating brutalist scroll HUD with dynamic progress metric and 1-click smooth return to top.
  - GPU-accelerated staggered card reveals on scroll and interactive 3D perspective tilt on hover.
- **Interactive Rules Dossier Drawer**: Slides out from the right displaying official competition rules, multi-round schedules, weighted judging rubrics, and direct Call & WhatsApp student/faculty coordinators.
- **Team & Solo Registration with SBI UPI QR**:
  - Dual registration modes ("Create Squad" with auto-generated team codes e.g. `CYBE-668` or "Join Squad").
  - Dynamic fee calculation with University SBI UPI QR (`chaitanyahptu@sbi`) and 12-digit transaction UTR submission.
  - Confirmed official digital Entry Ticket Pass with QR code, venue details, and unique Pass ID.
- **Multi-Tab Admin Command Center**:
  - `[ 01. ATTENDEES ]`: Comprehensive participant registry with contact numbers, colleges, and registered events.
  - `[ 02. SQUADS & TEAMS ]`: Squad roster with unique team codes, leader details, and roster capacity.
  - `[ 03. UPI PAYMENTS & UTR ]`: Real-time verification queue with total revenue metrics and **1-click `[ ✓ Approve ]` / `[ ✕ Reject ]` actions**.
  - **Master Multi-Tab Excel Export (`.xls`)**: One-click download of a clean XML SpreadsheetML workbook containing separate sheets for Attendees, Squads, and Payment Audits.
  - **CSV Export (`.csv`)**: Instant spreadsheet download of the active tab.
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
│   ├── events-data.js          # Dataset for 12 competitions, rules, rounds & coordinators
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
├── audio/                      # Spatial sound effects and ambient tracks
├── fonts/                      # 3D Three.js FontLoader JSON geometries
├── hdri/                       # High dynamic range environment reflections
├── images/                     # SVG icons, badges, UI elements and patterns
├── models/                     # 3D GLB/GLTF assets & Draco decompression wasm
└── textures/                   # PBR material textures & bump maps
```

---

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

Authorized fest administrators (`chaitanyahptu@gmail.com`) can access the command center at any time:
1. Open the user profile modal in the top navigation bar, or run `openAuthModal('admin')` in the browser console.
2. Review attendees, squads, and submitted 12-digit UPI UTRs.
3. Click **`[ ✓ Approve ]`** to verify payments and confirm ticket issuance.
4. Click **`[ Export to Excel (.xls) ]`** to download the complete master fest database.

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
