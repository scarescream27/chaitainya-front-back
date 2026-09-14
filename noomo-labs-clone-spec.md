# Noomo Labs — Full Site Clone & Hummingbird Replacement Project

**Project**: Clone labs.noomoagency.com byte-for-byte, then replace the glass jellyfish with a glass hummingbird.
**First milestone**: Copy the entire site exactly as-is. Zero features dropped.
**Second milestone**: Swap jellyfish → hummingbird, keep all interactions intact.

---

## 1. Executive Summary

Noomo Labs is Noomo Agency's experimental 3D playground — a single-page Nuxt 3 + Three.js website that works as both a technology demo and a portfolio piece. The core experience is a glass jellyfish swimming through scroll-driven 3D rings, inside a physics-shattered glass sphere, with a lil-gui customizer panel for material properties.

The site is a **Vercel-hosted Nuxt 3 SPA** with all logic compiled into minified JS bundles under `/_nuxt/`. The HTML shell is ~61KB; the JS bundles total ~1.4MB; 3D assets total ~13MB.

**Core tech**:
- Nuxt 3 (Vue 3, Vite production build)
- Three.js (v155+ era, bundled)
- GSAP 3 + CustomEase + CustomBounce + ScrollTrigger + Flip plugin
- Cannon-es (physics: glass sphere shattering, footer ball interaction)
- Lenis (smooth scroll)
- lil-gui 0.19.2 (the jellyfish customizer panel — dat.GUI replacement)
- Swiper Vue (carousel/slider component)
- HTML5 Audio (4 MP3s)
- Custom fonts: Druk Medium (rendered from JSON font data), IBM Plex Mono (TTF)

---

## 2. Site Architecture

### Routes / Pages

| Route | Description |
|---|---|
| `/` | Home — full Three.js 3D scene (the main experience) |
| `/contact` | Contact page |
| `/work` | Work/portfolio listing |
| `/cases/3d-configurator` | Case study: 3D configurator |
| `/cases/intel-ai-io` | Case study: Intel AI project |
| `/cases/noomo-beat` | Case study: Noomo Beat |
| `/cases/the-silly-bunny` | Case study: The Silly Bunny |
| `/fwa` | FWA (Favourite Website Awards) page |
| `/music-demo` | Music demo page |
| `/privacy-policy` | Privacy policy |

### HTML Shell (`index.html` — 61KB)

The HTML is a **minimal Nuxt 3 shell** — it loads:
- 3 CSS files: `entry.3PlfWDsj.css`, `swiper-vue.Bs3d9ZnH.css`, `homeFooter.HIs-kcXb.css`
- 1 module entry JS: `iNjJ8EkR.js` (876KB — the main app bundle)
- 7 modulepreload/prefetch JS chunks: `CkGjpDBV.js`, `C4-CPqZe.js`, `TM5kMQuH.js`, `DkR7Kq9H.js`, `DNkUmkFf.js`, `3GHhKpoT.js`, `BQveAYI3.js`
- Inline `<style>` blocks: 35+ blocks containing all component CSS (preloader, cursor, scene-texts, footer, header, mobile-menu, swiper themes, transitions, error page, etc.)
- Inline `window.__NUXT__` config object
- Body contains: `scene-texts` div (with SVG icons, text content, left/right bars with progress), `social-links-global-parent`, `#__nuxt` mount point

### JS Bundle Breakdown

| File | Size | Purpose |
|---|---|---|
| `iNjJ8EkR.js` | 876KB | Main app — Nuxt 3 runtime, Vue components, Three.js scene, GSAP animations, all page logic. **This is the core.** |
| `CkGjpDBV.js` | 31KB | Nuxt resolver/imports — re-exports, Vue/Nuxt runtime helpers |
| `C4-CPqZe.js` | 17KB | Additional Nuxt utilities |
| `TM5kMQuH.js` | 4.4KB | NuxtLink component, route prefetching, intersection observer |
| `DkR7Kq9H.js` | 125KB | **GSAP + CustomEase + CustomBounce plugins** + 3D scene logic. This is where the cannon-es physics, the jellyfish scene, the scroll narrative, the footer interaction all live. Contains `homePreloader`, `clickAndHold`, `sceneTextsComponent`, `index` (main page component). |
| `DNkUmkFf.js` | 31KB | **lil-gui 0.19.2** — the customizer panel UI library (dat.GUI replacement). Full source of the UI controller library. |
| `3GHhKpoT.js` | 1.8KB | `homeFooter` Vue component |
| `BQveAYI3.js` | 345B | Tiny utility chunk |

### Key Components (from JS analysis)

1. **`homePreloader`** — Loading screen with progress bar, audio toggle, "Loading %" text, volume toggle with Waves.png/WavesOff.png icons, "TURN ON / TO MAKE THIS EXPERIENCE MORE IMMERSIVE WE USE SOUND EFFECTS" microcopy. Animated with GSAP.

2. **`clickAndHold`** — The glass sphere click-and-hold interaction. Progress bar fills on hold. On release, sphere shatters via Cannon.js physics. Audio: ParticleScattering.mp3. Shows "Are you ready to step into the future? Click and hold / Tap and hold" text.

3. **`sceneTextsComponent`** — The scroll-driven text panels. Left bar with "AR / 3D / AI / XR" labels and cross icons. Right bar with progress percentage. Bottom texts: bottom-text-1 (with textLightning.svg icon), bottom-text-2 (with textFace.svg icon), bottom-text-3 (with textPlus.svg icon). Left text panel, right text panel. All opacity-animated via GSAP ScrollTrigger at specific scroll positions.

4. **`homeFooter`** — Footer with "Let's innovate together" heading, social links (LinkedIn, hello@noomoagency.com, Twitter), [ ] [ ] send message button, copyright.

5. **`index`** — Main page component. Sets up the full 3D scene, custom cursor, mouse/touch event handlers for glass sphere interaction (onMousedown, onMouseup, onTouchstart, onTouchend).

6. **Custom cursor** — `#cursor` div (25px, transparent, backdrop-blur, follows mouse via mousemove). On interactive elements, switches to "difference" blend mode and shows text labels. CSS in inline styles: `#cursor` and `#cursor .wrapper`.

7. **Jellyfish customizer (lil-gui)** — Not a visible page component; it's the 3D scene's dat.GUI panel. Controls 3 glass materials with parameters: Glass Material 1 (thickness, backside, backsideThickness, reflectivity, roughness, anisotropy, chromaticAberration, distortion, thickness, temporalDistortion, anisotropicBlur, attenuationColor, attenuationDistance), Glass Material 2 (Thickness 2, Reflectivity 2, Roughness 2, Anisotropy 2, Chromatic Aberration 2, Distortion 2, Thickness 2, Temporal Distortion 2, Anisotropic Blur 2, Attenuation Color 2, Color 2, Attenuation Distance 2), Glass Material 3 (opacity).

---

## 3. 3D Scene Architecture (Deep Dive)

### Scene Setup

- **Renderer**: WebGLRenderer with antialias, toneMapping (ACESFilmicToneMapping likely), outputColorSpace = SRGB, shadows, physically-correct lights
- **Camera**: PerspectiveCamera, likely 75° FOV, positioned to frame the jellyfish
- **Scene**: Single main scene with layers
- **Lighting**: HDRI environment map (photo_studio_01_1k.hdr + sphere5.png) for image-based lighting, plus directional/point lights for the glass specular highlights
- **Post-processing**: Likely UnrealBloomPass or custom for the glow, possibly OutputPass

### The Jellyfish Model

- **File**: `/models/Scene14.glb` (8.0MB — the largest asset)
- **Structure**: Two meshes combined:
  1. Jellyfish body mesh with a jellyfish texture (translucent, bioluminescent look)
  2. Glass material mesh (modified MeshPhysicalMaterial with transmission, roughness, metalness, clearcoat, ior, chromaticAberration, anisotropy, distortion)
- **Animation**: Swimming motion via vertex animation or bone animation inside the GLB. The GLB likely contains animations that GSAP controls or Three.js AnimationMixer plays.
- **Customization**: 3 glass materials on different parts, all controllable via lil-gui

### The Glass Sphere (Pre-loader Phase)

- **Physics**: Cannon-es world. A glass sphere mesh (Sphere_footer_baked.glb or procedural sphere) with a Cannon.js body.
- **Shatter mechanism**: An invisible mesh calculates polygon centers on the sphere's faces, then places small plane meshes at each polygon center. These become the shards. On click-and-hold release, the sphere breaks into these shards which fly apart with physics.
- **Audio**: Sphere-collision.mp3 plays on shatter, ParticleScattering.mp3 during the hold progress

### Scroll Narrative

- Jellyfish swims through 3D rings (one ring per "case" / project)
- Bottom-to-top scroll direction
- GSAP ScrollTrigger timelines control:
  - Text panel opacity (bottom-text-1/2/3 appear at different scroll positions)
  - Left/right text panels
  - Progress bar percentage (0% → 100%)
- Scroll positions are window-width-dependent (mobile vs desktop breakpoints at 1024px and 767px)

### Interactive Footer

- 12 cloned instances of `Sphere_footer_baked.glb` (a baked sphere with cross texture from `/textures/cross.jpg`)
- Cannon-es physics: each ball has mass 0.5, angularDamping 0.1, linearDamping 0.65
- Click/drag to throw balls — they collide and reveal the logo
- Audio: Sphere-collision.mp3 on each collision
- A large invisible plane (mass 0) acts as the floor

### Custom Cursor

- DOM element `#cursor` (25px circle, transparent background, backdrop-filter blur 12px, border-radius 50%)
- Follows mouse via `mousemove` listener, updates `transform: translate(-50%, -50%)`
- On hover of interactive elements: adds `.dif` class → `mix-blend-mode: difference`, white background
- Shows text labels (e.g., "Click and hold", "View Case", "start me in →") via child `.text` span with IBM Plex Mono font

### Jellyfish Customizer (lil-gui)

- Panel appears as an overlay (lil-gui creates its own DOM)
- Controls for 3 MeshPhysicalMaterial instances:
  - Material 1 (main jellyfish glass): color, attenuationColor, attenuationDistance, thickness, roughness, metalness, clearcoat, ior, chromaticAberration, anisotropy, anisotropicBlur, distortion, temporalDistortion, backside, backsideThickness
  - Material 2 (secondary glass element): same parameter set with "2" suffix
  - Material 3: opacity control
- Settings persist per session (likely in memory/state)

---

## 4. Asset Inventory (All Downloaded)

### Total: 13MB

```
assets/
├── audio/                          (1.17MB total)
│   ├── BG-music.mp3                485KB   — ambient background music
│   ├── BG5.mp3                     518KB   — background music variant
│   ├── ParticleScattering.mp3      66KB   — shatter/particle sound
│   └── Sphere-collision.mp3        98KB   — ball collision sound
│
├── fonts/
│   └── Druk_Regular.json           116KB   — font glyph data for in-browser Druk rendering
│
├── hdri/
│   ├── photo_studio_01_1k.hdr      1.6MB   — main HDRI environment map (lighting)
│   └── sphere5.png                 1.0MB   — environment map (cubemap face or equirectangular)
│
├── images/icons/                   (28KB total, 13 files)
│   ├── arrowNext.svg                279B   — arrow icon for "start me in →"
│   ├── JelIcon.svg                 2.5KB   — jellyfish icon
│   ├── Logo.svg                    6.9KB   — Noomo logo
│   ├── Logo_labs.svg               7.2KB   — Noomo Labs logo
│   ├── patternCus1.png             818B    — custom pattern
│   ├── patternCus2.png             876B    — custom pattern
│   ├── restartIcon.svg             839B    — restart icon
│   ├── rightBar.svg                5.1KB   — right bar progress icon
│   ├── textFace.svg                409B    — face/text icon
│   ├── textLightning.svg           316B    — lightning/text icon
│   ├── textPlus.svg                560B    — plus/text icon
│   ├── Waves.png                   2.9KB   — audio waves (off state)
│   └── WavesOff.png                141B    — audio waves (on state)
│
├── models/                         (8.2MB total)
│   ├── errorModel.glb              31KB    — error state 3D model
│   ├── half4.glb                   10KB    — half model (4)
│   ├── Scene14.glb               8,000KB    — *** MAIN JELLYFISH MODEL ***
│   ├── segRoman.glb               12KB    — segmented roman model
│   └── Sphere_footer_baked.glb   118KB    — baked sphere for footer physics
│
├── textures/                       (42KB total)
│   ├── cross.jpg                   1.5KB   — cross texture for footer spheres
│   ├── paternWhiteBlackBack.jpg   32KB    — pattern texture
│   └── whiteTexture.jpg            9KB    — white procedural texture
│
├── OpenGraph.jpg                   186KB   — social share image
└── fav.png                          4KB    — favicon
```

---

## 5. Full CSS Architecture

### Inline Styles (in HTML head, 35+ blocks)

These are all the component-scoped styles, inlined by Nuxt's SSR. Key blocks:

1. **Font faces**: DrukMedium (OTF from `/_nuxt/DrukMedium.BRGZC52w.otf`), IBM Plex Mono (TTF from `/_nuxt/IBMPlexMono-Medium.DNBbcQit.ttf`), swiper-icons (base64 WOFF embedded)

2. **Base reset**: `html{font-family:Source Sans Pro...}`, `*,:after,:before{box-sizing:border-box;margin:0}`, `a{text-decoration:none}`

3. **Swiper themes** (blocks 17-29): Full Swiper CSS — notification, cards, creative, cube, fade, flip, free-mode, grid, navigation buttons, pagination, scrollbar, virtual, zoom. All inlined.

4. **#error-scene**: Fixed overlay for error state

5. **Social links global**: `.social-links-global-parent`, `.social-links-global` (fixed bottom, flex justify-between, padding 20px), `.ar-mode` (AR mode panel with options menu, color swatches, sliders)

6. **Custom cursor**: `#cursor` (25px, fixed, pointer-events none, z-index 100), `.wrapper` (backdrop-filter blur 12px, background hsla(0,0%,100%,.6), border-radius 50%, transition .3s), `.text` (IBM Plex Mono 12px, uppercase, opacity 0), `.dif` (mix-blend-mode difference)

7. **Transition component**: `.transition-component` (fixed full-screen, clip-path circle animation), `.dots` (background image transitionDots.png)

8. **Error page**: `.error-page`, `.go-home` button (DrukMedium 33.528px, uppercase, absolute positioned)

9. **Body background**: `html{background:linear-gradient(0deg,#b4cbf5,#f7faff),linear-gradient(0deg,#96bbff,#edf4ff),linear-gradient(0deg,#b4cbf5,#fff 111.72%);background-attachment:fixed}`

10. **Header**: `header` (fixed, 65px height, z-index 20), `.header` (flex, height 100%), `.vr` (circular button, backdrop-filter blur, display none on desktop), `.menu-switch` (4 lines, hamburger animation), `.mobile-menu` (full-height absolute menu)

11. **#__nuxt**: `position:relative;z-index:11`

12. **Body cursor override**: `body,body a{cursor:none}` — all cursor rendering is custom

13. **Home page**: `.home-page{height:10000px;-webkit-user-select:none}`, `audio{display:none}`

14. **Scene texts**: `.scene-texts` (fixed, z-index 8, opacity 0), `.right-bar` (15px wide, right side, progress percentage rotated 90°), `.left-bar` (15px wide, left side, AR/3D/AI/XR labels with cross icons), `.wrapper` (44px left offset), `.left-text`/`.right-text` (DrukMedium 48px, uppercase, 27vw width), `.bottom-texts` (3 bottom paragraphs)

15. **Home preloader**: `.home-preloader` (fixed full-screen, z-index 99, opacity 0), `.top` (110px height), `.center` (flex center), `.done` (absolute, send message button with 4 corner elements that animate on hover), `.loading` ("Loading" text), `.progress` (bar with fill), `.value` (percentage text), `.bottom` (volume toggle with Waves icons, "on"/"off" text, "TURN ON / TO MAKE THIS EXPERIENCE MORE IMMERSIVE WE USE SOUND EFFECTS" microcopy)

16. **Home footer**: `.home-footer` (bottom 50vh, backdrop-filter blur 16.75px, background hsla(0,0%,100%,.4)), `.wrapper` (flex column, justify space-between), `.for-social`, `.socials` (3 links in DrukMedium 7.5vw), `h4` ("Let's innovate together" in DrukMedium 48.897px), `.bottom` (copyright, points), `.send` (animated 4-corner element)

17. **Page body class**: `index-page-body` — applied to `<body>` on home page

---

## 6. Step-by-Step Clone Instructions

### Phase 1: Get the site running locally (exact copy)

**1.1 Directory structure**

```
noomo-labs-clone/
├── index.html          (copy of noomo.html — the 61KB Nuxt shell)
├── _nuxt/
│   ├── iNjJ8EkR.js    (876KB — main bundle)
│   ├── CKgjpDBV.js    (31KB)
│   ├── C4-CPqZe.js    (17KB)
│   ├── TM5kMQuH.js    (4.4KB)
│   ├── DkR7Kq9H.js    (125KB — scene logic + GSAP plugins)
│   ├── DNkUmkFf.js    (31KB — lil-gui)
│   ├── 3GHhKpoT.js    (1.8KB — footer component)
│   ├── BQveAYI3.js    (345B)
│   ├── entry.3PlfWDsj.css
│   ├── swiper-vue.Bs3d9ZnH.css
│   ├── homeFooter.HIs-kcXb.css
│   ├── DrukMedium.otf
│   └── IBMPlexMono.ttf
└── assets/
    ├── audio/         (4 MP3s)
    ├── fonts/         (Druk_Regular.json)
    ├── hdri/          (photo_studio_01_1k.hdr, sphere5.png)
    ├── images/icons/  (13 SVG/PNG files)
    ├── models/        (5 GLB files)
    ├── textures/      (3 JPG files)
    ├── OpenGraph.jpg
    └── fav.png
```

**1.2 Serve it**

```bash
cd noomo-labs-clone
npx serve . -p 3000
# or
python3 -m http.server 3000
```

The site should run identically to the live version.

**1.3 Critical: the Nuxt JS expects to be served from `/` root**

The JS bundles reference assets with absolute paths like `/models/Scene14.glb`, `/audio/BG5.mp3`, `/_nuxt/iNjJ8EkR.js`. You must serve from the root of `noomo-labs-clone/` with the `_nuxt/` and `assets/` directories at the root level. Do NOT nest them in subdirectories.

**1.4 Critical: CORS / MIME types**

- `.glb` files must serve with `Content-Type: model/gltf-binary`
- `.hdr` files must serve with `Content-Type: application/octet-stream` (Three.js RTTLoader accepts this)
- `.mp3` files: `audio/mpeg`
- `.otf`/`.ttf`: `font/otf`, `font/ttf`
- `.png`/`.jpg`/`.svg`: standard image types
- `.json`: `application/json`

If you use `npx serve`, it handles most of these automatically. If you use Python's http.server, you may need a custom handler for `.glb` and `.hdr`.

**1.5 Verify**

Open `http://localhost:3000` — you should see the loading screen, then the glass sphere with jellyfish inside, click-and-hold to shatter, scroll to navigate, footer balls to play with, lil-gui panel for customization.

---

### Phase 2: Modify the site

**2.1 Replace the jellyfish model**

- Prepare your hummingbird GLB (must be watertight, optimized for web, ideally under 5-8MB)
- The original `Scene14.glb` has 2 meshes: one with a jellyfish texture, one with glass material
- For the hummingbird: either (a) bake the glass material into the GLB as a MeshPhysicalMaterial with transmission, or (b) keep the GLB as a standard mesh and apply glass materials via Three.js code at runtime
- Recommended: Model the hummingbird in Blender with a glass material that mimics the jellyfish's look — transmission ~0.9, roughness ~0.1, clearcoat ~1.0, ior ~1.5, chromaticAberration ~0.1, anisotropy ~0.5. Export as GLB with the material embedded.

**2.2 Adjust the 3D scene for the hummingbird**

- The jellyfish swims (translates + rotates) through the scene. The hummingbird should fly (different motion profile — wing flaps, forward flight, banking turns).
- If the GLB has animations: import the animation clips and play them via Three.js `AnimationMixer`. Match the scroll-driven motion to the hummingbird's flight pattern.
- The 3 glass material parameters (thickness, roughness, anisotropy, chromaticAberration, distortion, etc.) should transfer directly — just apply them to the hummingbird's meshes instead of the jellyfish's.

**2.3 Update text/content**

- `scene-texts` component: bottom-text-1, bottom-text-2, bottom-text-3, left-text, right-text — all in the HTML body and in `DkR7Kq9H.js`
- Footer: "Let's innovate together" heading, social links, copyright
- Loading screen microcopy: "Are you ready to step into the future?", "TO MAKE THIS EXPERIENCE MORE IMMERSIVE WE USE SOUND EFFECTS"
- The scroll narrative text panels (3 cases minimum — AR, 3D, AI, XR labels in left bar)

**2.4 Update colors/branding**

- The site is black-on-white with glass. If you want a different palette, change:
  - CSS color values in the inline styles (the 35+ style blocks in index.html)
  - The glass material colors (attenuationColor, color params in lil-gui)
  - The background gradient (currently `linear-gradient(0deg,#b4cbf5,#f7faff)`)
  - The HDRI environment (swap `photo_studio_01_1k.hdr` for your own HDRI)

**2.5 Audio**

- Replace the 4 MP3s with your own sound design
- Audio elements are referenced in `DkR7Kq9H.js`:
  - `/audio/Sphere-collision.mp3` — glass shatter sound
  - `/audio/BG5.mp3` — background music
  - `/audio/ParticleScattering.mp3` — particle/scatter sound during hold
  - `/audio/BG-music.mp3` — ambient music (mentioned in JS string references)

**2.6 The lil-gui customizer**

- `DNkUmkFf.js` is the full lil-gui 0.19.2 library source — it's self-contained
- The customizer panel is created in `DkR7Kq9H.js` — look for the lil-gui controller creation code
- You can add/remove/rename controllers for the hummingbird's material properties

---

### Phase 3: Rebuild from scratch (if you want clean source code)

If modifying the minified bundles is too painful, rebuild:

```bash
npx nuxi init noomo-hummingbird
cd noomo-hummingbird
npm install three @types/three gsap @gsap/bonus-plugins lenis cannon-es lil-gui swiper swiper/vue
```

Then recreate:
1. A Vue component that mounts a Three.js scene (scene, camera, renderer, HDRI env map, lights)
2. Load the hummingbird GLB with GLTFLoader, apply glass MeshPhysicalMaterials
3. Cannon-es physics world for the glass sphere shatter + footer balls
4. GSAP ScrollTrigger timelines for scroll narrative (text panels, progress bar)
5. GSAP click-and-hold timeline for the sphere shatter progress
6. Custom cursor (DOM element following mousemove)
7. lil-gui panel for material customization
8. Home preloader component (loading screen with progress, audio toggle)
9. Footer component
10. Nuxt pages for each route

---

## 7. Known Gotchas

1. **The JS is Vite production minified** — single-line, mangled variable names. You can read it and patch string literals (paths, text content), but restructuring logic is painful. For serious changes, rebuild from scratch.

2. **The Nuxt runtime is baked into `iNjJ8EkR.js`** — this includes Vue 3 runtime, Nuxt 3 router, SSR hydration logic, composables. You can't easily extract just the Three.js scene without the Nuxt overhead.

3. **`DkR7Kq9H.js` contains CustomEase + CustomBounce GSAP plugins** — these are registered at module load time. If you rebuild, you need `@gsap/bonus-plugins` (paid) or find open-source equivalents.

4. **The glass sphere shatter uses Cannon-es `ContactMaterial` and `Trimesh`** — the shatter creates plane meshes at polygon centers of an invisible mesh. This is custom physics logic, not a library feature.

5. **Font rendering**: Druk Medium is NOT loaded as a standard web font (no `@font-face` with `.woff2`). Instead, `Druk_Regular.json` contains glyph data that's used by a custom font renderer in the JS (likely a Three.js TextGeometry or a custom canvas-based renderer). The IBM Plex Mono is a standard TTF `@font-face`.

6. **The site uses `body,body a{cursor:none}`** — all cursor rendering is the custom `#cursor` div. If you remove the custom cursor, add `cursor: default` back to body.

7. **`window.__NUXT__` config** in the HTML is minimal — just `public.device`, `public.gtag`, `public.gtm`, `app.baseURL`, `app.buildAssetsDir`, `app.cdnURL`. The site doesn't rely on SSR hydration for the 3D scene (it's all client-side).

8. **Scene14.glb is 8MB** — this is the bottleneck. If you replace it with a hummingbird GLB, keep it under 5-8MB for acceptable load times. Use Draco compression if needed (`gltf-pipeline -i input.glb -o output.glb -d`).

9. **Mobile breakpoints**: The JS checks `window.innerWidth > 1024` and `window.innerWidth > 767` in several places for scroll trigger start/end positions and UI layout. Test on mobile.

10. **Audio autoplay policy**: The site has a "TURN ON" button because browsers block autoplay. The user must interact before audio plays. Keep this pattern.

---

## 8. Files Included in This Project

- `noomo.html` — the full 61KB Nuxt HTML shell (saved from live site)
- `_nuxt/` — all 8 JS bundles + 3 CSS files + 2 font files
- `assets/` — all 3D models, textures, HDRIs, audio, icons, fonts
- This MD file — the complete specification

---

## 9. Task List for Claude Code / Antigravity Agent

### Phase 1: Exact clone (nothing missing)

- [ ] Set up directory: `noomo-labs-clone/` with `index.html`, `_nuxt/`, `assets/`
- [ ] Verify all files are present and correct sizes (see Asset Inventory above)
- [ ] Set up a local dev server (npx serve or Python http.server with correct MIME types)
- [ ] Test: open localhost, verify loading screen appears, audio toggle works, glass sphere renders, click-and-hold shatters, scroll navigates, footer balls interact, lil-gui panel opens
- [ ] Take screenshots at each stage to verify pixel-accuracy against the live site
- [ ] Fix any 404s or CORS issues (check browser console for errors)
- [ ] Verify all 10 routes load (/, /contact, /work, /cases/*, /fwa, /music-demo, /privacy-policy)

### Phase 2: Hummingbird replacement

- [ ] Source or model a glass hummingbird GLB (recommend Blender → export with MeshPhysicalMaterial transmission)
- [ ] Test the GLB in a simple Three.js viewer first to verify materials render correctly
- [ ] Replace `Scene14.glb` with the hummingbird GLB in the assets folder
- [ ] Update any JS references to the old model path if needed
- [ ] Adjust the swimming/flight animation: if the GLB has armature animations, wire them up; if not, create procedural wing-flap + flight motion
- [ ] Verify the glass material parameters (thickness, roughness, anisotropy, chromaticAberration, distortion, etc.) still apply correctly to the new model
- [ ] Update the lil-gui customizer labels if needed (e.g., "Jellyfish" → "Hummingbird")
- [ ] Update all text content: scene-texts, footer, loading screen, case labels
- [ ] Update branding: logos, colors, HDRI if desired
- [ ] Replace audio files with custom sound design
- [ ] Full QA pass: every interaction works, every page loads, mobile responsive, no console errors
- [ ] Deploy to a staging URL for review

### Phase 3: Optional cleanup

- [ ] If rebuilding from scratch: create clean Nuxt 3 project structure with readable source files
- [ ] Extract the Three.js scene into a well-documented Vue composable
- [ ] Add source maps for debugging
- [ ] Document the build process

---

## 10. Prompt for Claude Code / Antigravity

Use this prompt verbatim with the agent:

---

**PROMPT:**

You are building a clone of labs.noomoagency.com — a Nuxt 3 + Three.js 3D website — and then replacing the glass jellyfish with a glass hummingbird.

## What exists on disk

I have already downloaded the complete live site to this directory:

- `noomo.html` — the full 61KB Nuxt 3 HTML shell (saved from the live site via curl)
- `_nuxt/` — all 8 JavaScript bundles, 3 CSS files, 2 font files (DrukMedium.otf, IBMPlexMono.ttf)
- `assets/` — all media:
  - `audio/`: BG-music.mp3, BG5.mp3, ParticleScattering.mp3, Sphere-collision.mp3
  - `fonts/`: Druk_Regular.json
  - `hdri/`: photo_studio_01_1k.hdr, sphere5.png
  - `images/icons/`: 13 SVG/PNG files (arrowNext, JelIcon, Logo, Logo_labs, patternCus1, patternCus2, restartIcon, rightBar, textFace, textLightning, textPlus, Waves, WavesOff)
  - `models/`: errorModel.glb, half4.glb, Scene14.glb (THE JELLYFISH — 8MB), segRoman.glb, Sphere_footer_baked.glb
  - `textures/`: cross.jpg, paternWhiteBlackBack.jpg, whiteTexture.jpg
  - `OpenGraph.jpg`, `fav.png`

## Phase 1: Clone the site exactly

1. Create a directory `noomo-labs-clone/` with the exact structure:
   ```
   noomo-labs-clone/
   ├── index.html        (copy of noomo.html)
   ├── _nuxt/            (copy of _nuxt/ folder — all JS, CSS, fonts)
   └── assets/           (copy of assets/ folder — all media)
   ```

2. Set up a local dev server that serves this directory at `http://localhost:3000`. Use `npx serve` or Python. Ensure these MIME types are correct:
   - `.glb` → `model/gltf-binary`
   - `.hdr` → `application/octet-stream`
   - `.mp3` → `audio/mpeg`
   - `.otf` → `font/otf`
   - `.ttf` → `font/ttf`

3. Open the site in a browser (or headless test). Verify:
   - Loading screen appears with "LOADING" text, progress bar, "TURN ON" audio button, "TO MAKE THIS EXPERIENCE MORE IMMERSIVE WE USE SOUND EFFECTS" microcopy
   - Glass sphere with jellyfish inside renders (Scene14.glb)
   - Click-and-hold on the sphere: progress bar fills, on release the sphere shatters into physics shards
   - Audio plays: ParticleScattering.mp3 on shatter, BG5.mp3 in background
   - Scroll down: jellyfish swims through 3D rings, text panels appear (bottom-text-1/2/3, left-text, right-text), progress bar shows 0%→100%
   - At the bottom: interactive footer with 12 physics balls (Sphere_footer_baked.glb) — click/drag to throw them, they collide and reveal logo, Sphere-collision.mp3 plays
   - Lil-gui panel appears for customizing glass material properties (3 materials with parameters: thickness, backside, backsideThickness, reflectivity, roughness, anisotropy, chromaticAberration, distortion, temporalDistortion, anisotropicBlur, attenuationColor, attenuationDistance, opacity)
   - Custom cursor follows mouse, shows text on hover, switches to difference blend mode on interactive elements
   - All 10 routes work: /, /contact, /work, /cases/3d-configurator, /cases/intel-ai-io, /cases/noomo-beat, /cases/the-silly-bunny, /fwa, /music-demo, /privacy-policy

4. Fix any 404s, CORS errors, or MIME type issues. Check the browser console for errors.

5. Take screenshots of each state to verify against the live site.

## Phase 2: Replace jellyfish with hummingbird

1. I will provide a glass hummingbird GLB file. When provided:
   - Replace `assets/models/Scene14.glb` with the hummingbird GLB
   - The hummingbird should use the same glass material approach: MeshPhysicalMaterial with transmission, roughness, clearcoat, ior, chromaticAberration, anisotropy, distortion, etc.
   - The 3 glass material parameters in lil-gui should still control the hummingbird's materials

2. Update the 3D scene:
   - The hummingbird should FLY, not swim — adjust the motion profile (forward flight, banking, wing flaps if the GLB has animations, or create procedural wing motion)
   - The scroll narrative should still work: hummingbird flies through 3D rings as user scrolls
   - All text panels, progress bar, footer physics, customizer panel should work identically

3. Update all text content to reflect the hummingbird theme (if desired — or keep as-is for now)

4. Full QA: every interaction works, no console errors, all routes load, mobile responsive

## Rules

- Do NOT drop any feature. Every pixel, every animation, every sound, every interaction from the original site must survive the clone.
- The site is minified production JS. You can patch string literals (paths, text) directly in the JS files. For structural changes (like the model swap), you may need to work with the JS as-is or rebuild.
- If a feature is broken and you cannot fix it within 30 minutes, document it clearly and move on.
- Report every issue found, every fix applied, and every verification screenshot taken.

## Deliverables

- A running local dev server at http://localhost:3000 with the cloned site
- A written report: what was cloned, what was verified, any issues found
- The hummingbird GLB integrated and the scene updated (Phase 2)
- Final screenshots of the hummingbird in action

---

## 11. For the Agent: Quick Reference

### How to serve with correct MIME types (Python)

```python
# save as mime_server.py
import http.server
import socketserver

MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.otf': 'font/otf',
    '.ttf': 'font/ttf',
    '.glb': 'model/gltf-binary',
    '.hdr': 'application/octet-stream',
    '.mp3': 'audio/mpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
}

class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        ext = path.rsplit('.', 1)[-1].lower() if '.' in path else ''
        return MIME.get(f'.{ext}', 'application/octet-stream')

PORT = 3000
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
```

### How to check the site programmatically (Playwright)

```bash
npm install playwright
npx playwright install chromium
```

```javascript
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(5000);
  // Check loading screen
  const loadingText = await page.textContent('body');
  console.log('Page loaded:', loadingText?.substring(0, 200));
  console.log('Errors:', errors);
  await browser.close();
})();
```

### Key JS string references to patch

In `DkR7Kq9H.js` (the main scene logic), search for these strings to find where assets and text are referenced:

- `"/models/Scene14.glb"` — the jellyfish model path
- `"/models/errorModel.glb"` — error state model
- `"/models/half4.glb"` — half model
- `"/models/segRoman.glb"` — segmented roman model
- `"/models/Sphere_footer_baked.glb"` — footer ball model
- `"/hdri/photo_studio_01_1k.hdr"` — HDRI
- `"/hdri/sphere5.png"` — environment map
- `"/textures/cross.jpg"` — footer sphere texture
- `"/textures/paternWhiteBlackBack.jpg"` — pattern texture
- `"/textures/whiteTexture.jpg"` — white texture
- `"/audio/BG-music.mp3"` — background music
- `"/audio/BG5.mp3"` — background music variant
- `"/audio/ParticleScattering.mp3"` — shatter sound
- `"/audio/Sphere-collision.mp3"` — collision sound
- `"/fonts/Druk_Regular.json"` — font data
- `"Are you ready to step into the future?"` — loading screen text
- `"Click and hold"` / `"Tap and hold"` — interaction hint
- `"Welcome to a Creative space showcasing groundbreaking projects that blend creativity and technology"` — bottom-text-1
- `"Follow us into the future of interactive and immersive digital experiences"` — bottom-text-2
- `"Engage with us at Noomo Labs, where technology meets creativity, and every interaction is an opportunity for innovation"` — bottom-text-3
- `"Each project at Noomo Labs serves as a testament to our commitment to innovation and excellence"` — left text
- `"Browse our portfolio to see the magic we create with cutting-edge technologies including XR, AR, AI and 3D."` — right text
- `"Let's innovate together"` — footer heading
- `"T\\u043E make this experience more immersive we use sound effects"` — audio microcopy (note: \u043E is Cyrillic 'о' — "TO" with a Cyrillic O)

---

*End of specification.*
