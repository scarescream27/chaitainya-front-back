/**
 * ============================================================================
 * File: home-footer.js
 * Purpose: Home footer component with interactive physics ball, message button, and social links.
 * ============================================================================
 */
import { _ as w, __tla as k } from "./nuxt-link.js";
import { u as x, __tla as F } from "./app-main.js";
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
    let l, r, o, c, i, m, d, u, h, p, _, f, v, y, g;
    ((l = { class: "home-footer" }),
      (r = { class: "wrapper" }),
      (o = e("h4", null, "Let's innovate together", -1)),
      (c = e("span", { class: "elem-1 elem" }, "[", -1)),
      (i = e("span", { class: "elem-2 elem" }, "]", -1)),
      (m = e("span", { class: "elem-3 elem" }, "[", -1)),
      (d = e("span", { class: "elem-4 elem" }, "]", -1)),
      (u = e(
        "div",
        { class: "circle" },
        [
          e("div", { class: "inner-circle" }, [
            e("p", null, [b("send"), e("br"), b(" message")]),
          ]),
        ],
        -1,
      )),
      (h = [c, i, m, d, u]),
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
                  e("div", p, [
                    e("div", _, [
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
