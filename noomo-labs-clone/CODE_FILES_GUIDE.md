# Noomo Labs — Code Files & Architecture Guide

This guide maps out all renamed files inside `noomo-labs-clone/_nuxt/` so developers can immediately recognize and navigate the codebase.

---

## 🚀 Core Application & 3D WebGL

| File Name | Former Name | Description & Contents |
|---|---|---|
| [`home-scene-3d.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/home-scene-3d.js) | `DkR7Kq9H.js` | **The Main 3D Experience**: Contains Cannon-es physics engine, glass sphere shattering effect, GSAP CustomEase/CustomBounce, 3D jellyfish model loader, home preloader screen, and scroll-driven narrative text cards (`sceneTextsComponent`). |
| [`app-main.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/app-main.js) | `iNjJ8EkR.js` | **Main App Runtime**: Nuxt 3 core, Vue 3, Three.js WebGL engine, global router, smooth cursor follower, and volume/sound state. |
| [`lil-gui-customizer.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/lil-gui-customizer.js) | `DNkUmkFf.js` | **Glass Customizer Panel**: lil-gui 0.19.2 library controller used for real-time adjustments of glass material refraction, roughness, thickness, and color. |
| [`home-footer.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/home-footer.js) | `3GHhKpoT.js` | **Interactive Footer**: Footer component with "Let's innovate together", message button, social links, and Cannon physics footer ball. |
| [`header-navbar.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/header-navbar.js) | `2fu6TH5x.js` | **Header & Navigation**: Fixed navigation header with agency logo, menu links, and responsive full-screen mobile drawer menu. |

---

## ⚡ Framework Runtime & Utilities

| File Name | Former Name | Description & Contents |
|---|---|---|
| [`vue-runtime.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/vue-runtime.js) | `CKgjpDBV.js` | Vue 3 core runtime helpers, component lifecycle, reactivity system, and virtual DOM renderer. |
| [`nuxt-router-utils.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/nuxt-router-utils.js) | `C4-CPqZe.js` | Nuxt 3 routing, route prefetching, hydration helpers, and error handlers. |
| [`nuxt-link.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/nuxt-link.js) | `TM5kMQuH.js` | `NuxtLink` component with intersection observer prefetching for instant page transitions. |
| [`route-utils.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/route-utils.js) | `BQveAYI3.js` | Utility chunk for route resolution and component lazy-loading. |

---

## 📄 Subpages & Case Studies

| File Name | Former Name | Description & Contents |
|---|---|---|
| [`work-page.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/work-page.js) | `DKGb1mZ9.js` | Portfolio / Work listing page component. |
| [`contact-page.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/contact-page.js) | `CA3Rur4S.js` | Contact page component with interactive message form. |
| [`music-demo-page.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/music-demo-page.js) | `CSep-jLl.js` | Music demo page component with interactive audio playback controls. |
| [`fwa-page.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/fwa-page.js) | `DlCcWg24.js` | FWA awards showcase page. |
| [`privacy-policy-page.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/privacy-policy-page.js) | `Dt4Oo8o4.js` | Privacy policy legal document page component. |
| [`case-3d-configurator.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/case-3d-configurator.js) | `CcJv3dlN.js` | Case study: 3D Configurator showcase. |
| [`case-intel-ai.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/case-intel-ai.js) | `DkoBn3Pb.js` | Case study: Intel AI IO interactive experience. |
| [`case-noomo-beat.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/case-noomo-beat.js) | `BJT7jpvC.js` | Case study: Noomo Beat rhythmic web experience. |
| [`case-the-silly-bunny.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/case-the-silly-bunny.js) | `opyRkiVr.js` | Case study: The Silly Bunny 3D character experience. |
| [`case-dynamic-id.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/case-dynamic-id.js) | `1_XIEbu9.js` | Dynamic case study route handler (`/cases/:id`). |
| [`case-info-shared.js`](file:///c:/Users/adity/OneDrive/Desktop/Humming%20Bird/noomo-labs-clone/_nuxt/case-info-shared.js) | `evonP4q8.js` | Case study shared template layout, image viewer, and Swiper carousel. |

---

## 🎨 Stylesheets (CSS)

| File Name | Former Name | Purpose |
|---|---|---|
| `entry.css` | `entry.3PlfWDsj.css` | Core site typography, layout reset, and global styles |
| `index-scene.css` | `index.Ddxhybik.css` | Home page 3D overlay, preloader, and side text card styles |
| `homeFooter.css` | `homeFooter.HIs-kcXb.css` | Footer layout and typography styles |
| `swiper-vue.css` | `swiper-vue.Bs3d9ZnH.css` | Swiper carousel transition and button styles |
| `contact.css` | `contact.Di2Gg8yQ.css` | Contact page layout and form styles |
| `default-layout.css` | `default.CmGZ4oYe.css` | Default page wrapper layout styles |
| `caseInfo.css` | `caseInfo.CAhSDw_i.css` | Case study detail view styles |
| `work.css` | `work.CHux-Hpp.css` | Work page listing grid styles |
| `case-id.css` | `_id_.BbI0P46B.css` | Dynamic case page styles |
