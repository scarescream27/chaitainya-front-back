/**
 * ============================================================================
 * File: profile-page-view.js
 * Purpose: /profile route — full-page participant profile (see profile-panel.js).
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b, E as rt } from "./vue-runtime.js";
import { renderProfilePageHtml, mountProfilePage } from "./profile-panel.js";

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "profile",
      setup(l) {
        t({
          title: "Chaitanya 2k26 | My Profile",
          meta: [
            {
              name: "description",
              content: "Your Chaitanya 2k26 profile, event registrations and entry QR codes.",
            },
          ],
        });

        rt(() => {
          try {
            mountProfilePage();
          } catch (err) {
            console.error("Error initializing profile page:", err);
          }
        });

        const html = renderProfilePageHtml();

        return (i, c) => (
          be(),
          xe("div", { class: "profile-page-vue-mount" }, [
            b("div", { class: "profile-page-wrapper", innerHTML: html }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
