/**
 * ============================================================================
 * File: not-found-page.js
 * Purpose: Catch-all route — "Page not found" for unknown URLs. Reuses the
 * privacy page's hero/button styles (privacy-policy.css).
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b } from "./vue-runtime.js";

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "not-found",
      setup(l) {
        try {
          const trans = document.querySelector(".transition-component");
          if (trans) {
            trans.style.display = "none";
            trans.style.opacity = "0";
          }
        } catch (e) {}

        t({
          title: "Chaitanya 2k26 | Page not found",
          meta: [{ name: "robots", content: "noindex" }],
        });

        const html = `
          <div class="privacy-container">
            <div class="privacy-top-bar">
              <a href="/" class="privacy-back-btn"><span>←</span> RETURN TO HOME</a>
              <a href="/events" class="privacy-contact-btn">EXPLORE EVENTS</a>
            </div>
            <div class="privacy-hero">
              <span class="privacy-tag-badge">Error 404</span>
              <h1>Page not found</h1>
              <p class="subtitle">We can't find this page. It may have moved. Go back home or look at the events.</p>
            </div>
          </div>`;

        return (i, c) => (
          be(),
          xe("div", { class: "privacy-page-root not-found-page-root" }, [
            b("div", { class: "privacy-page-wrapper", innerHTML: html }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
