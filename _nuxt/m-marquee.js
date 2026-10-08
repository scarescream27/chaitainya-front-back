/**
 * ============================================================================
 * File: m-marquee.js
 * Purpose: Phone-only building blocks (styles in m-pages.css): a row of
 * cards that drifts left to right, and the person / event cards it carries.
 * Used by /organisers, the home page events strip and the mobile pages.
 * ============================================================================
 */
import { escapeHtml as esc } from "./fest-config.js";
import { PHOTOS, initials, personSlug } from "./teams-data.js";

/**
 * One looping row. The items are repeated so each half is at least `min`
 * cards wide, then the half is doubled (copy hidden from screen readers) so
 * the CSS loop (translateX -50% -> 0) is seamless.
 */
export function marqueeHtml(items, { label = "", min = 6, secsPerCard = 4, still = false } = {}) {
  if (!items.length) return "";
  // still: a plain swipeable row (no drift, no faded edges).
  if (still)
    return `
    <div class="m-swipe" role="region" aria-label="${esc(label)}">
      <ul class="m-marquee-track">${items.map((h) => `<li>${h}</li>`).join("")}</ul>
    </div>`;
  let half = items.slice();
  while (half.length < min) half = half.concat(items);
  const copy = half.map((html) => html.replace(/<a /g, '<a tabindex="-1" '));
  return `
    <div class="m-marquee" role="region" aria-label="${esc(label)}" style="--dur: ${half.length * secsPerCard}s">
      <ul class="m-marquee-track">
        ${half.map((h) => `<li>${h}</li>`).join("")}
        ${copy.map((h) => `<li aria-hidden="true">${h}</li>`).join("")}
      </ul>
    </div>`;
}

/** Person card: photo as the background when there is one, else initials. */
export function personCardHtml(p, tint = "var(--cat-tech)") {
  const photo = PHOTOS[p.name];
  return `
    <a class="m-card m-card-person" href="/organisers/${esc(personSlug(p.name))}" style="--tint: ${tint}${
      photo ? `; --bg: url('${esc(photo)}')` : ""
    }">
      ${photo ? "" : `<span class="m-card-mark" aria-hidden="true">${esc(initials(p.name))}</span>`}
      <span class="m-card-body">
        <strong>${esc(p.name)}</strong>
        <span>${esc(p.role || "")}</span>
      </span>
    </a>`;
}

/** Event card: event.image as the background when set, else the category mark. */
export function eventCardHtml(ev, accent, mark) {
  return `
    <a class="m-card m-card-event" href="/events/${encodeURIComponent(ev.id)}" style="--tint: ${accent || "var(--cat-tech)"}${
      ev.image ? `; --bg: url('${esc(ev.image)}')` : ""
    }">
      ${ev.image ? "" : `<span class="m-card-mark" aria-hidden="true">${esc(mark || "")}</span>`}
      <span class="m-card-body">
        <span class="m-card-kicker">${esc(ev.categoryName || "")}</span>
        <strong>${esc(ev.title)}</strong>
      </span>
    </a>`;
}

/**
 * Drifting rows pause while off screen. Rows are inserted as HTML by several
 * pages, so instead of each caller wiring this up, every track announces
 * itself through `animationstart` (plus a sweep for rows already running).
 * Hidden tabs need nothing: browsers stop CSS animations there on their own.
 */
// iOS Safari only applies :active (the touch pause in m-pages.css) when a
// touchstart listener exists. Drags never count as taps: the home footer's
// tap guard (shutter-footer.js) swallows clicks after the finger moved.
if (typeof document !== "undefined") document.addEventListener("touchstart", () => {}, { passive: true });

if (typeof window !== "undefined" && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      // ponytail: a row removed while already off screen stays observed (a few
      // detached nodes per visit); add a route-change sweep if that ever matters.
      if (!en.target.isConnected) io.unobserve(en.target);
      else en.target.classList.toggle("is-offscreen", !en.isIntersecting);
    }
  });
  document.addEventListener("animationstart", (e) => {
    if (e.animationName === "m-drift" && e.target.parentElement) io.observe(e.target.parentElement);
  });
  document.querySelectorAll(".m-marquee").forEach((el) => io.observe(el));
}
