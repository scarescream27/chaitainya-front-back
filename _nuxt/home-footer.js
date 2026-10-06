/**
 * ============================================================================
 * File: home-footer.js
 * Purpose: Home footer: fest dates, register link, contact email.
 * ============================================================================
 */
import { _ as w, __tla as k } from "./nuxt-link.js";
import { u as x, __tla as F } from "./app-main.js";
import { getFestDatesLabel } from "./fest-config.js";
import {
  H as A,
  F as H,
  M as e,
  L,
  J as N,
  u as n,
  W as B,
  X as b,
} from "./vue-runtime.js";
let M,
  E = Promise.all([
    (() => {
      try {
        return k;
      } catch {}
    })(),
    (() => {
      try {
        return F;
      } catch {}
    })(),
  ]).then(async () => {
    let l, r, o, p, _, f, v, y, g;
    ((l = { class: "home-footer" }),
      (r = { class: "wrapper" }),
      (o = e("h4", null, `${getFestDatesLabel()} · HPTU Hamirpur`, -1)),
      (p = { class: "for-social" }),
      (_ = { class: "socials" }),
      (f = { class: "bottom" }),
      (v = e("p", { class: "copy" }, "\xA9 All rights reserved", -1)),
      (y = e("div", { class: "points" }, null, -1)),
      (g = {
        __name: "homeFooter",
        setup(J) {
          const a = x();
          return (P, s) => {
            const C = w;
            return (
              A(),
              H("div", l, [
                e("div", r, [
                  o,
                  e("div", p, [
                    e("div", _, [
                      e(
                        "a",
                        {
                          href: "/events",
                          onClick: (t) => {
                            const router = document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
                            if (router) (t.preventDefault(), router.push("/events"));
                          },
                        },
                        "Register for events →",
                      ),
                      e(
                        "a",
                        {
                          onMouseleave:
                            s[2] || (s[2] = (t) => n(a).hideCursor("", "none")),
                          onMouseenter:
                            s[3] ||
                            (s[3] = (t) => n(a).blendCursor("difference")),
                          target: "_blank",
                          href: "mailto:chaitanyahptu@gmail.com",
                        },
                        "chaitanyahptu@gmail.com",
                        32,
                      ),
                    ]),
                    e("div", f, [v, B("", !0)]),
                  ]),
                  y,
                ]),
              ])
            );
          };
        },
      }),
      (M = g));
  });
export { M as H, E as __tla };
