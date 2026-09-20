/**
 * ============================================================================
 * File: route-utils.js
 * Purpose: Utility chunk for route resolution and component lazy-loading.
 * ============================================================================
 */
import { ax as e, a as l, __tla as r } from "./app-main.js";
import { F as o, aa as n, H as _ } from "./vue-runtime.js";
let a,
  u = Promise.all([
    (() => {
      try {
        return r;
      } catch {}
    })(),
  ]).then(async () => {
    a = {
      __name: "builder",
      setup(m) {
        const t = e();
        return (
          l({ bodyAttrs: { class: t.name + "-page" } }),
          (s, p) => (_(), o("div", null, [n(s.$slots, "default")]))
        );
      },
    };
  });
export { u as __tla, a as default };
