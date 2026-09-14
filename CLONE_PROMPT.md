# CLAUDE CODE / ANTIGRAVITY AGENT PROMPT
# Project: Clone labs.noomoagency.com + Replace Jellyfish with Hummingbird

## CONTEXT

You are cloning the complete Noomo Labs website (labs.noomoagency.com) — a Nuxt 3 + Three.js 3D immersive experience — and then replacing the glass jellyfish mascot with a glass hummingbird. The site is a Vercel-hosted SPA. All the source files have been downloaded from the live site and are on disk in this directory.

## FILES ON DISK

```
noomo.html              (61KB — full Nuxt 3 HTML shell, saved via curl)
_nupt/                  (8 JS bundles + 3 CSS + 2 fonts — all production-compiled)
assets/
  audio/                (4 MP3s: BG-music, BG5, ParticleScattering, Sphere-collision)
  fonts/                (Druk_Regular.json — Druk font glyph data)
  hdri/                 (photo_studio_01_1k.hdr, sphere5.png — environment maps)
  images/icons/         (13 SVG/PNG files — logos, icons, waves)
  models/               (5 GLB files — Scene14.glb is the 8MB jellyfish, Sphere_footer_baked.glb for footer physics)
  textures/             (3 JPGs — cross, pattern, white)
  OpenGraph.jpg         (social share image)
  fav.png               (favicon)
```

Full spec document: `C:\Users\adity\Desktop\noomo-labs-clone-spec.md` (35KB — read this first, it has everything)

## YOUR TASK — PHASE 1 ONLY (clone the site, nothing else)

### Step 1: Set up the directory

Create `noomo-labs-clone/` with this exact structure:
- `noomo-labs-clone/index.html` → copy of `noomo.html`
- `noomo-labs-clone/_nuxt/` → copy of `_nuxt/` (all JS, CSS, fonts)
- `noomo-labs-clone/assets/` → copy of `assets/` (all media)

### Step 2: Serve the site locally

Set up a dev server at `http://localhost:3000` that serves this directory. Use `npx serve . -p 3000` from inside `noomo-labs-clone/`. You MUST ensure these MIME types are correct or Three.js will fail to load assets:

- `.glb` → `model/gltf-binary`
- `.hdr` → `application/octet-stream`
- `.mp3` → `audio/mpeg`
- `.otf` → `font/otf`
- `.ttf` → `font/ttf`

If `npx serve` doesn't handle these correctly, write a small Python MIME-aware server (see spec doc for the code).

### Step 3: Verify the clone

Open `http://localhost:3000` in a browser (Playwright headless or manually). Verify ALL of the following:

1. Loading screen: "LOADING" text + progress bar + percentage + "TURN ON" audio button + "TO MAKE THIS EXPERIENCE MORE IMMERSIVE WE USE SOUND EFFECTS" microcopy
2. Glass sphere renders with jellyfish inside (Scene14.glb loaded via Three.js)
3. Click-and-hold on sphere: progress bar fills up, on release the sphere shatters into physics shards (Cannon-es)
4. Audio: ParticleScattering.mp3 on shatter, BG5.mp3 background, Sphere-collision.mp3 on footer ball hits
5. Scroll down: jellyfish swims through 3D rings, text panels fade in/out (bottom-text-1/2/3 with lightning/face/plus icons, left-text, right-text), right-side progress bar shows 0%→100%
6. At the bottom: 12 physics balls (Sphere_footer_baked.glb) that you can click/drag to throw — they collide and reveal logo
7. Lil-gui panel (dat.GUI style) for customizing glass material properties — 3 materials with sliders for thickness, roughness, anisotropy, chromaticAberration, distortion, attenuationColor, attenuationDistance, opacity, etc.
8. Custom cursor: 25px circle follows mouse, shows text labels on hover ("Click and hold", "View Case", "start me in →"), switches to difference blend mode
9. All 10 routes: /, /contact, /work, /cases/3d-configurator, /cases/intel-ai-io, /cases/noomo-beat, /cases/the-silly-bunny, /fwa, /music-demo, /privacy-policy

Check the browser console for ANY errors. Fix 404s, CORS issues, MIME type problems.

### Step 4: Screenshot verification

Take screenshots of:
- Loading screen
- Glass sphere with jellyfish (before shatter)
- After shatter (physics shards flying)
- Mid-scroll (jellyfish swimming through rings with text panels visible)
- Footer with physics balls
- Lil-gui customizer panel open
- Mobile viewport (767px or less — verify responsive layout)
- Each of the 10 routes

### Step 5: Report

Write a report with:
- What was cloned and verified
- Every console error found and fixed
- Screenshots attached or referenced
- Any features that didn't work and why

## RULES

- Do NOT skip any feature. Every pixel, animation, sound, and interaction from the live site must survive.
- The JS is minified production code. You can patch string literals directly. Don't try to rewrite the whole thing — make the existing compiled site work first.
- If something takes more than 30 minutes to fix, document it and move on.
- The full detailed spec is at `C:\Users\adity\Desktop\noomo-labs-clone-spec.md` — read it for deep technical details on the scene architecture, CSS, asset inventory, and known gotchas.

## DELIVERABLES

1. `noomo-labs-clone/` directory with the complete running site
2. Dev server running at `http://localhost:3000`
3. Verification report with screenshots
4. Zero dropped features

---
## NEXT PHASE (do NOT start yet)

Phase 2 will replace the glass jellyfish (Scene14.glb) with a glass hummingbird GLB. The hummingbird should fly instead of swim, with wing-flap animations. All other features stay identical. I will provide the hummingbird GLB when Phase 1 is complete and verified.
