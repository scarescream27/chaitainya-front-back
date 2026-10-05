/**
 * ============================================================================
 * File: admin-page-view.js
 * Purpose: /admin route — organiser dashboard (see admin-dashboard.js).
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b, E as rt } from "./vue-runtime.js";
import { renderAdminPageHtml, mountAdminPage } from "./admin-dashboard.js";

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "admin",
      setup(l) {
        t({
          title: "Chaitanya 2k26 | Admin Dashboard",
          meta: [
            {
              name: "description",
              content: "Chaitanya 2k26 organiser dashboard.",
            },
          ],
        });

        rt(() => {
          try {
            mountAdminPage();
          } catch (err) {
            console.error("Error initializing admin page:", err);
          }
        });

        const html = renderAdminPageHtml();

        return (i, c) => (
          be(),
          xe("div", { class: "admin-page-vue-mount" }, [
            b("div", { class: "admin-page-wrapper", innerHTML: html }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
