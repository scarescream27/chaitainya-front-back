/**
 * ============================================================================
 * File: shutter-footer.js
 * Purpose: Home footer: "Shutter Glyph Footer" (plain-JS port of
 * components/ui/shutter-glyph-footer.tsx) with the Contact Us form built in.
 * ============================================================================
 *
 * The brand is set across the full width in a geometric display alphabet drawn
 * as SVG (no font). One letter is a "shutter": three blades meeting at a pivot
 * that turns toward the pointer. Hover a letter and it slices along its waist;
 * click one and it flips; click the shutter and its blades turn a quarter.
 *
 * The site is a Vue bundle with no build step, so this is framework-free DOM
 * code; home-footer.js mounts it into the footer element.
 */
import { submitToWeb3Forms } from "./web3forms-config.js";
import { submitQueryTicket, getCurrentUser } from "./auth-service.js";
import { escapeHtml as esc } from "./fest-config.js";

// #region glyphs (verbatim from the component, types removed)

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Cap height of every glyph, in SVG units. The wordmark's viewBox is this tall. */
export const CAP = 100;
const S = 19; // stem
const B = 17; // bar

const f = (n) => String(Math.round(n * 100) / 100);

export const rect = (x, y, w, h) => "M" + f(x) + " " + f(y) + "H" + f(x + w) + "V" + f(y + h) + "H" + f(x) + "Z";

export const slant = (x1, y1, x2, y2, t) =>
  "M" + f(x1) + " " + f(y1) + "H" + f(x1 + t) + "L" + f(x2 + t) + " " + f(y2) + "H" + f(x2) + "Z";

const at = (cx, cy, rx, ry, deg) => {
  const a = (deg * Math.PI) / 180;
  return f(cx + rx * Math.cos(a)) + " " + f(cy + ry * Math.sin(a));
};

export const band = (cx, cy, rx, ry, tx, ty, a0, a1) => {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const cw = a1 > a0 ? 1 : 0;
  const irx = rx - tx;
  const iry = ry - ty;
  return (
    "M" + at(cx, cy, rx, ry, a0) +
    "A" + f(rx) + " " + f(ry) + " 0 " + large + " " + cw + " " + at(cx, cy, rx, ry, a1) +
    "L" + at(cx, cy, irx, iry, a1) +
    "A" + f(irx) + " " + f(iry) + " 0 " + large + " " + (1 - cw) + " " + at(cx, cy, irx, iry, a0) +
    "Z"
  );
};

export const ring = (cx, cy, rx, ry, tx, ty) => {
  const e = (r1, r2) =>
    "M" + f(cx - r1) + " " + f(cy) +
    "A" + f(r1) + " " + f(r2) + " 0 1 1 " + f(cx + r1) + " " + f(cy) +
    "A" + f(r1) + " " + f(r2) + " 0 1 1 " + f(cx - r1) + " " + f(cy) + "Z";
  return e(rx, ry) + e(rx - tx, ry - ty);
};

export const bowl = (x, y, w, h, t, tb) => {
  const ry = h / 2;
  const rx = Math.min(w - t, ry * 0.95);
  const sx = x + w - rx;
  return (
    "M" + f(x) + " " + f(y) + "H" + f(sx) +
    "A" + f(rx) + " " + f(ry) + " 0 0 1 " + f(sx) + " " + f(y + h) + "H" + f(x) + "Z" +
    "M" + f(x + t) + " " + f(y + tb) + "H" + f(sx) +
    "A" + f(rx - t) + " " + f(ry - tb) + " 0 0 1 " + f(sx) + " " + f(y + h - tb) + "H" + f(x + t) + "Z"
  );
};

const SPACE = { w: 42, d: [] };

export const GLYPHS = {
  A: { w: 96, d: [slant(37, 0, 0, 100, 23), slant(37, 0, 73, 100, 23), rect(18, 60, 60, 16)] },
  B: { w: 84, d: [rect(0, 0, S, 100), bowl(0, 0, 78, 52, S, B), bowl(0, 52 - B, 84, 100 - 52 + B, S, B)] },
  C: { w: 90, d: [band(45, 50, 45, 50, S + 2, B, -40, -320)] },
  D: { w: 90, d: [rect(0, 0, S + 1, 100), bowl(0, 0, 90, 100, S + 2, B)] },
  E: { w: 72, d: [rect(0, 0, S, 100), rect(0, 0, 72, B), rect(0, 41.5, 64, B), rect(0, 100 - B, 72, B)] },
  F: { w: 70, d: [rect(0, 0, S, 100), rect(0, 0, 70, B), rect(0, 43, 62, B)] },
  G: { w: 94, d: [band(47, 50, 47, 50, S + 2, B, -38, -360), rect(48, 46, 46, B)] },
  H: { w: 86, d: [rect(0, 0, S, 100), rect(86 - S, 0, S, 100), rect(0, 42, 86, B)] },
  I: { w: S + 2, d: [rect(0, 0, S + 2, 100)] },
  J: { w: 72, d: [rect(72 - S, 0, S, 64), band(36, 62, 36, 38, S, B, 0, 180)] },
  K: { w: 86, d: [rect(0, 0, S, 100), slant(62, 0, 10, 62, 24), slant(30, 42, 62, 100, 24)] },
  L: { w: 68, d: [rect(0, 0, S, 100), rect(0, 100 - B, 68, B)] },
  M: { w: 112, d: [rect(0, 0, S + 3, 100), slant(0, 0, 46, 100, 9), slant(68, 0, 40, 100, 22), rect(112 - S - 3, 0, S + 3, 100)] },
  N: { w: 88, d: [rect(0, 0, S, 100), rect(88 - S, 0, S, 100), slant(0, 0, 63, 100, 25)] },
  O: { w: 100, d: [ring(50, 50, 50, 50, S + 2, B)] },
  P: { w: 80, d: [rect(0, 0, S, 100), bowl(0, 0, 80, 60, S, B)] },
  Q: { w: 100, d: [ring(50, 50, 50, 50, S + 2, B), slant(50, 62, 78, 100, 22)] },
  R: { w: 84, d: [rect(0, 0, S, 100), bowl(0, 0, 82, 58, S, B), slant(34, 50, 62, 100, 22)] },
  S: { w: 80, d: [band(40, 29.25, 40, 29.25, S, B, -22, -273), band(40, 70.75, 40, 29.25, S, B, -93, 158)] },
  T: { w: 82, d: [rect(0, 0, 82, B), rect(41 - S / 2 - 1, 0, S + 2, 100)] },
  U: { w: 86, d: [rect(0, 0, S, 60), rect(86 - S, 0, S, 60), band(43, 58, 43, 42, S, B, 0, 180)] },
  V: { w: 94, d: [slant(0, 0, 36, 100, 22), slant(72, 0, 36, 100, 22)] },
  W: { w: 132, d: [slant(0, 0, 26, 100, 20), slant(56, 0, 26, 100, 20), slant(56, 0, 86, 100, 20), slant(112, 0, 86, 100, 20)] },
  X: { w: 92, d: [slant(0, 0, 68, 100, 24), slant(68, 0, 0, 100, 24)] },
  Y: { w: 92, d: [slant(0, 0, 35, 56, 22), slant(70, 0, 35, 56, 22), rect(35, 50, 22, 50)] },
  Z: { w: 80, d: [rect(0, 0, 80, B), rect(0, 100 - B, 80, B), slant(56, B - 1, 0, 100 - B + 1, 24)] },
};

export const glyphOf = (ch) => GLYPHS[ch.toUpperCase()] ?? SPACE;

export const SHUTTER = 100;
const K = 21;
export const REST = 77;

export const turn = (x, y, turns) => {
  const n = ((turns % 4) + 4) % 4;
  let a = x;
  let b = y;
  for (let i = 0; i < n; i++) {
    const t = a;
    a = SHUTTER - b;
    b = t;
  }
  return [a, b];
};

export const restPivot = (turns) => turn(REST, REST, turns);

export const blades = (px, py, turns) => {
  const [qx, qy] = turn(clamp(px, 8, 92), clamp(py, 8, 92), -turns);
  const shapes = [
    [0, 0, K, 0, qx, qy, 0, K],
    [qx, 0, SHUTTER, 0, SHUTTER, K, qx, qy],
    [0, qy, qx, qy, K, SHUTTER, 0, SHUTTER],
  ];
  return shapes.map((s) => {
    const out = [];
    for (let i = 0; i < s.length; i += 2) out.push(...turn(s[i], s[i + 1], turns));
    return out;
  });
};

export const layout = (word, shutterAt, gap = 12) => {
  const items = [];
  let x = 0;
  Array.from(word).forEach((ch, i) => {
    const shutter = i === shutterAt && ch.trim() !== "";
    const w = shutter ? SHUTTER : glyphOf(ch).w;
    items.push({ ch, x, w, shutter });
    x += w + gap;
  });
  return { items, width: Math.max(1, x - (items.length ? gap : 0)) };
};

export const approach = (from, to, k, dt) => to + (from - to) * Math.pow(1 - clamp(k, 0, 1), clamp(dt, 0, 0.1) * 60);

const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>";

export const scramble = (text, progress, seed) => {
  const chars = Array.from(text);
  const settled = Math.floor(clamp(Number.isFinite(progress) ? progress : 1, 0, 1) * chars.length);
  return chars
    .map((ch, i) => {
      if (i < settled || !/[a-z0-9]/i.test(ch)) return ch;
      const r = Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1;
      return NOISE[Math.floor(r * NOISE.length)];
    })
    .join("");
};

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());

// #endregion

const SVGNS = "http://www.w3.org/2000/svg";
const ARROW =
  '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h9.2M6.4 2.2 10.2 6l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/></svg>';
const CHECK =
  '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6.4 4.6 9.4 10.6 2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>';

const DEFAULTS = {
  wordmark: "CHAITANYA",
  shutterAt: 2,
  copy: "© 2026\nChaitanya 2k26 · HPTU Hamirpur",
  contactLabel: "Ask us about events, registration or anything else",
  email: "chaitanyahptu@gmail.com",
  connect: [
    { label: "Email us", href: "mailto:chaitanyahptu@gmail.com" },
    { label: "Events", href: "/events" },
    { label: "About", href: "/about" },
    { label: "Register", href: "#register" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Back to top", href: "#top", action: "top" },
  ],
};

let uidSeq = 0;

/**
 * Build the footer inside `root` (an empty <footer class="home-footer sgf">).
 * Returns { destroy } which removes every listener, observer and frame loop.
 */
export function mountShutterFooter(root, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const uid = "sgf" + ++uidSeq;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const still = Boolean(reduced);
  // Phones have no hovering pointer: the shutter rests (tap still turns it).
  const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
  const cleanups = [];
  const on = (el, type, fn, opt) => {
    el.addEventListener(type, fn, opt);
    cleanups.push(() => el.removeEventListener(type, fn, opt));
  };
  let delayMs = 0;
  const delay = () => `--sgf-d:${(delayMs += 60)}ms`;

  const linkItem = (l) => `
    <li class="sgf-fade" style="${delay()}">
      <a class="sgf-link" href="${esc(l.href)}"${l.action ? ` data-sgf-action="${esc(l.action)}"` : ""} aria-label="${esc(l.label)}">
        <span aria-hidden="true">${esc(l.label)}</span>${ARROW}
      </a>
    </li>`;

  root.dataset.in = still ? "true" : "false";
  root.innerHTML = `
    <div class="sgf-top">
      <form class="sgf-form sgf-fade" style="${delay()}" novalidate aria-labelledby="${uid}-lede">
        <h2 class="sgf-lede" id="${uid}-lede">${esc(o.contactLabel)}</h2>
        <div class="sgf-fields" data-state="idle">
          <div class="sgf-field"><label class="sr-only" for="${uid}-name">Name</label>
            <input class="sgf-input" id="${uid}-name" name="name" autocomplete="name" maxlength="80" placeholder="Name" /></div>
          <div class="sgf-field"><label class="sr-only" for="${uid}-email">Email</label>
            <input class="sgf-input" id="${uid}-email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" maxlength="120" placeholder="Email address" /></div>
          <div class="sgf-field"><label class="sr-only" for="${uid}-phone">Phone (optional)</label>
            <input class="sgf-input" id="${uid}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Phone (optional)" /></div>
          <div class="sgf-field sgf-field-msg"><label class="sr-only" for="${uid}-msg">Message</label>
            <textarea class="sgf-input" id="${uid}-msg" name="message" rows="3" maxlength="1500" placeholder="Your message"></textarea></div>
          <button class="sgf-send" type="submit"><span class="sgf-send-label">Send message</span><span class="sgf-go" aria-hidden="true">${ARROW}</span></button>
        </div>
        <p class="sgf-msg" id="${uid}-status" aria-live="polite"></p>
      </form>

      <nav aria-label="Connect"><ul class="sgf-list">${o.connect.map(linkItem).join("")}</ul></nav>

      <p class="sgf-copy sgf-fade" style="${delay()}">${esc(o.copy)}</p>

      <nav aria-label="More"><ul class="sgf-list">${o.legal.map(linkItem).join("")}</ul></nav>
    </div>
    <div class="sgf-mark">
      <p class="sr-only">${esc(o.wordmark)}</p>
    </div>`;

  // ---- wordmark ------------------------------------------------------------
  const word = o.wordmark.toUpperCase();
  const { items, width } = layout(word, o.shutterAt);
  const shutterItem = items.find((it) => it.shutter);
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "sgf-svg");
  svg.setAttribute("viewBox", `0 0 ${f(width)} ${CAP}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.aspectRatio = `${width} / ${CAP}`;
  const upId = uid + "-up";
  const dnId = uid + "-dn";
  let markup = `<defs>
      <clipPath id="${upId}" clipPathUnits="userSpaceOnUse"><rect x="-40" y="-200" width="400" height="252.6"/></clipPath>
      <clipPath id="${dnId}" clipPathUnits="userSpaceOnUse"><rect x="-40" y="51.4" width="400" height="250"/></clipPath>
    </defs>`;
  let turns = 0;
  items.forEach((it, i) => {
    if (it.ch.trim() === "") return;
    const rise = `--sgf-d:${200 + i * 90}ms`;
    if (it.shutter) {
      const rest = restPivot(turns);
      markup += `<g transform="translate(${f(it.x)} 0)"><g class="sgf-rise" style="${rise}"><g class="sgf-g sgf-sh" data-sgf-shutter>
        <rect width="${SHUTTER}" height="${CAP}" fill="transparent"/>
        ${blades(rest[0], rest[1], turns).map((pts) => `<polygon points="${pts.map(f).join(" ")}"/>`).join("")}
      </g></g></g>`;
      return;
    }
    const g = glyphOf(it.ch);
    const paths = g.d.map((p) => `<path d="${p}" fill-rule="evenodd"/>`).join("");
    markup += `<g transform="translate(${f(it.x)} 0)"><g class="sgf-rise" style="${rise}"><g class="sgf-g sgf-flip">
        <rect width="${g.w}" height="${CAP}" fill="transparent"/>
        <g clip-path="url(#${upId})"><g class="sgf-half sgf-up">${paths}</g></g>
        <g clip-path="url(#${dnId})"><g class="sgf-half sgf-dn">${paths}</g></g>
      </g></g></g>`;
  });
  svg.innerHTML = markup;
  root.querySelector(".sgf-mark").appendChild(svg);
  const bladeEls = [...svg.querySelectorAll("[data-sgf-shutter] polygon")];
  const paint = (x, y) =>
    blades(x, y, turns).forEach((pts, i) => bladeEls[i]?.setAttribute("points", pts.map(f).join(" ")));

  // Letters flip on click; the shutter turns a quarter.
  on(svg, "click", (e) => {
    const g = e.target.closest?.(".sgf-g");
    if (!g) return;
    if (g.hasAttribute("data-sgf-shutter")) {
      turns += 1;
      if (raf) return;
      pivot = restPivot(turns);
      paint(...pivot);
      return;
    }
    if (still) return;
    g.classList.remove("is-flip");
    void g.getBoundingClientRect();
    g.classList.add("is-flip");
  });
  on(svg, "animationend", (e) => e.target.classList?.remove("is-flip"));

  // ---- reveal + shutter tracking (only while on screen) ---------------------
  const ptr = { x: 0, y: 0, inside: false };
  let pivot = restPivot(0);
  let visible = false;
  let raf = 0;
  let last = 0;
  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const rest = restPivot(turns);
    const tx = ptr.inside ? clamp(ptr.x, 8, 92) : rest[0];
    const ty = ptr.inside ? clamp(ptr.y, 8, 92) : rest[1];
    pivot = [approach(pivot[0], tx, 0.12, dt), approach(pivot[1], ty, 0.12, dt)];
    paint(pivot[0], pivot[1]);
    // Settled: stop until the pointer moves again (no idle 60fps loop).
    if (Math.abs(pivot[0] - tx) + Math.abs(pivot[1] - ty) < 0.05) return (raf = 0);
    raf = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (raf || !visible || still || !canHover || !shutterItem) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) root.dataset.in = "true";
      cancelAnimationFrame(raf);
      raf = 0;
      wake();
    },
    { threshold: 0.1 },
  );
  io.observe(root);
  cleanups.push(() => {
    io.disconnect();
    cancelAnimationFrame(raf);
  });
  // Once the footer's top edge is in the top quarter of the screen, only a
  // faded strip of the 3D scene shows above it: the scene stops drawing
  // frames (that strip holds still) and the GPU is free while people type.
  // Fine thresholds so a jump (Contact Us link, Back to top) still reports.
  const cover = new IntersectionObserver(
    ([entry]) => {
      window.__sgfCovers = entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
    },
    { rootMargin: "-25% 0px 0px 0px", threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  );
  cover.observe(root);
  cleanups.push(() => {
    cover.disconnect();
    window.__sgfCovers = false;
  });
  const onPointer = (e) => {
    ptr.inside = e.type !== "pointerleave";
    if (!shutterItem) return;
    const r = svg.getBoundingClientRect();
    const scale = r.width / width || 1;
    ptr.x = (e.clientX - r.left) / scale - shutterItem.x;
    ptr.y = (e.clientY - r.top) / scale;
    wake();
  };
  if (!still && canHover) ["pointermove", "pointerenter", "pointerleave"].forEach((t) => on(root, t, onPointer, { passive: true }));

  // ---- links: scramble on hover/focus, internal ones via the router ---------
  root.querySelectorAll(".sgf-link").forEach((a) => {
    const span = a.querySelector("span");
    const text = span.textContent;
    let frame = 0;
    const run = () => {
      if (still) return;
      cancelAnimationFrame(frame);
      const t0 = performance.now();
      const seed = Math.random() * 100;
      let n = 0;
      const step = (now) => {
        const p = (now - t0) / 420;
        if (p >= 1) {
          span.textContent = text;
          return;
        }
        if (n++ % 2 === 0) span.textContent = scramble(text, p, seed + Math.floor(n / 2));
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    on(a, "pointerenter", run);
    on(a, "focus", run);
    cleanups.push(() => cancelAnimationFrame(frame));
  });
  on(root, "click", (e) => {
    const a = e.target.closest?.("a[data-sgf-action='top']");
    if (!a) return;
    e.preventDefault();
    const sm = window.ScrollSmoother?.get?.();
    sm ? sm.scrollTo(0, true) : window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
  });

  // ---- contact form ----------------------------------------------------------
  const form = root.querySelector("form");
  const fields = form.querySelector(".sgf-fields");
  const status = form.querySelector(".sgf-msg");
  const sendBtn = form.querySelector(".sgf-send");
  const sendLabel = form.querySelector(".sgf-send-label");
  const input = (n) => form.elements.namedItem(n);
  const user = getCurrentUser?.();
  if (user) {
    input("name").value = user.displayName || "";
    input("email").value = user.email || "";
  }
  let state = "idle";
  let spinTimer = 0;
  const setState = (next, message = "") => {
    state = next;
    fields.dataset.state = next;
    status.textContent = message;
    const busy = next === "sending";
    form.querySelectorAll("input, textarea, button").forEach((el) => (el.disabled = busy));
    clearInterval(spinTimer);
    if (busy) {
      let i = 0;
      sendLabel.textContent = "Sending " + (still ? "…" : "|");
      if (!still) spinTimer = setInterval(() => (sendLabel.textContent = "Sending " + "|/-\\"[++i % 4]), 90);
    } else {
      sendLabel.textContent = next === "failed" ? "Try again" : "Send message";
    }
  };
  cleanups.push(() => clearInterval(spinTimer));
  const shake = () => {
    if (still) return;
    fields.classList.remove("is-shake");
    void fields.getBoundingClientRect();
    fields.classList.add("is-shake");
  };
  on(fields, "animationend", () => fields.classList.remove("is-shake"));
  on(form, "input", (e) => {
    e.target.removeAttribute("aria-invalid");
    if (state === "error" || state === "failed") setState("idle");
  });

  on(form, "submit", async (e) => {
    e.preventDefault();
    if (state === "sending") return;
    const name = input("name").value.trim();
    const email = input("email").value.trim();
    const phone = input("phone").value.trim();
    const message = input("message").value.trim();
    const problems = [
      [name.length < 2, "name", "Enter your name"],
      [!isEmail(email), "email", "Enter an email like name@example.com"],
      [phone && phone.replace(/\D/g, "").length < 10, "phone", "Phone needs 10 digits, or leave it empty"],
      [message.length < 3, "message", "Write a short message"],
    ].filter(([bad]) => bad);
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (problems.length) {
      problems.forEach(([, n]) => input(n).setAttribute("aria-invalid", "true"));
      setState("error", problems[0][2]);
      shake();
      input(problems[0][1]).focus();
      return;
    }
    setState("sending");
    try {
      // Same path as the old contact page: e-mail via Web3Forms, then a ticket
      // for the admin dashboard (best effort; never blocks the reply).
      await submitToWeb3Forms({ name, email, contact_no: phone, team_name: "", query: message });
      submitQueryTicket({ name, email, phone, message, subject: "Website contact form" }).catch((err) =>
        console.warn("Contact ticket not saved:", err),
      );
    } catch (err) {
      setState("failed", `Couldn't send. Try again or write to ${o.email}`);
      // The button was disabled while sending, so focus fell to <body>; hand it back.
      if (!document.activeElement || document.activeElement === document.body) sendBtn.focus();
      shake();
      return;
    }
    if (!root.isConnected) return;
    setState("done");
    fields.hidden = true;
    const done = document.createElement("div");
    done.className = "sgf-done";
    done.setAttribute("role", "status");
    done.innerHTML = `${CHECK}<span>Message sent. We'll reply to ${esc(email)}</span><button type="button">Send another</button>`;
    form.insertBefore(done, status);
    done.querySelector("button").addEventListener("click", () => {
      done.remove();
      input("message").value = "";
      fields.hidden = false;
      setState("idle");
      input("message").focus();
    });
  });

  // ---- arriving from a Contact Us link (index.html sets __contactPending) ----
  const focusForm = () => input(input("name").value ? "message" : "name").focus({ preventScroll: true });
  window.__scrollToContact = () => {
    window.__contactPending = false;
    // Arrived via /contact: show the home URL (index.html would keep the deep link).
    if (location.pathname.replace(/\/$/, "") === "/contact") {
      window.__deepLinkPending = false;
      history.replaceState(history.state, "", "/");
    }
    const start = performance.now();
    let sawPause = false;
    const go = () => {
      if (!root.isConnected) return;
      const now = performance.now() - start;
      const sm = window.ScrollSmoother?.get?.();
      // Entering Home pauses the smoother (scrolled to the top) until the
      // intro lands. Wait for that pause and its release before scrolling,
      // or Home's reset undoes it. Timed, not frame-counted: slow phones
      // render far fewer frames meanwhile.
      if (sm?.paused()) sawPause = true;
      const waiting = !sm || sm.paused() || (!sawPause && now < 3000);
      if (waiting && now < 30000) return requestAnimationFrame(go);
      if (sm) sm.scrollTo(root, !still, "top top");
      else root.scrollIntoView({ behavior: still ? "auto" : "smooth" });
      focusForm();
    };
    go();
  };
  if (window.__contactPending) window.__scrollToContact();
  cleanups.push(() => {
    if (window.__scrollToContact) window.__scrollToContact = null;
  });

  return {
    destroy() {
      cleanups.splice(0).forEach((fn) => fn());
    },
  };
}
