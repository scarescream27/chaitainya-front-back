# Chaitanya 2k26 — Annual Tech & Cultural Fest

Official web platform for **Chaitanya 2k26**, the annual flagship technical and cultural fest of **Himachal Pradesh Technical University (HPTU Hamirpur)**.

An immersive, futuristic digital experience combining cutting-edge WebGL 3D graphics, physics simulations, soundscapes, participant event registrations, and a live administrative dashboard.

---

## Highlights

- **Immersive 3D Experience**: Powered by Three.js and Cannon-es with real-time physics, glass shattering animations, and scroll-driven interactive 3D camera choreography.
- **Dynamic Glass Customizer**: Real-time material shader configuration (roughness, transmission, opacity, and color palette).
- **Google Firebase Integration**: Seamless Google Sign-In, profile management, and attendee event registration connected to Cloud Firestore.
- **Brutalist Glassmorphism UI**: High-contrast, minimalist design language featuring `DrukMedium` display headers and `IBM Plex Mono` monospace typography.
- **Admin Control Center**: Secure administrative portal for tracking live fest registrations, reviewing attendee credentials, and exporting CSV rosters.
- **Interactive Contact & Messaging**: Inquiry channel integrated with Web3Forms and custom GSAP reactive particle effects.

---

## Project Structure

```
chaitanya-2k26/
├── index.html                  # Single-page application entry point
├── server.py                   # Multi-threaded local dev server with MIME & CORS support
├── FIREBASE_SETUP.md           # Guide for configuring Google Auth and Firestore
│
├── _nuxt/                      # Application runtime, components, and styles
│   ├── app-main.js             # WebGL orchestrator, Three.js scene, router & audio
│   ├── home-scene-3d.js        # Main 3D canvas, Cannon physics & preloader
│   ├── auth-modal.js           # Modal for Login, Registration, Profile & Admin
│   ├── auth-modal.css          # Frosted glass modal styling
│   ├── auth-service.js         # Firebase Auth, Firestore sync & user state
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
   cd "Humming Bird"
   ```

2. Start the local multi-threaded development server:
   ```bash
   python server.py
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

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
