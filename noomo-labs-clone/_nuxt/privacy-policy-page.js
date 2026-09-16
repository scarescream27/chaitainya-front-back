/**
 * ============================================================================
 * File: privacy-policy-page.js
 * Purpose: Privacy policy legal document page component.
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e } from "./vue-runtime.js";
let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "privacy-policy",
      setup(l) {
        return (
          t({
            title: "Chaitainya 2k26 | Privacy Policy",
            meta: [
              {
                name: "description",
                content: "Chaitainya 2k26 privacy policy page.",
              },
            ],
          }),
          (i, c) => null
        );
      },
    });
  });
export { r as __tla, a as default };
