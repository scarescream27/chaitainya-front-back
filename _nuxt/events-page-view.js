/**
 * ============================================================================
 * File: events-page-view.js
 * Purpose: Complete, responsive Chaitanya 2k26 Events & Arena page component.
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b, E as rt } from "./vue-runtime.js";
import { renderEventsPageHtml, initEventsPage } from "./events-page.js";

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "events",
      setup(l) {
        try {
          document.body.classList.add("has-events-page");
          const trans = document.querySelector(".transition-component");
          if (trans) {
            trans.style.display = "none";
            trans.style.opacity = "0";
            trans.style.clipPath = "circle(0 at 50% 50%)";
            trans.style.webkitClipPath = "circle(0 at 50% 50%)";
          }
        } catch (e) {}

        t({
          title: "Chaitanya 2k26 | Events & Competitions Arena",
          meta: [
            {
              name: "description",
              content: "All 20 events of Chaitanya 2k26 at HPTU Hamirpur, 30 Oct – 1 Nov 2026: coding, design, business, esports and cultural events. Details, student heads and registration.",
            },
          ],
        });

        rt(() => {
          try {
            initEventsPage();
          } catch (err) {
            console.error("Error initializing events page:", err);
          }
        });

        const eventsHtml = renderEventsPageHtml();

        return (i, c) => (
          be(),
          xe("div", { class: "events-page-vue-mount" }, [
            b("div", {
              class: "events-page-wrapper",
              innerHTML: eventsHtml,
            }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
