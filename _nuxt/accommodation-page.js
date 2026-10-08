/**
 * ============================================================================
 * File: accommodation-page.js
 * Purpose: /accommodation — the ₹999 on-campus stay package (3 fest nights,
 * all meals). Booking goes through the event checkout (events-page.js exposes
 * window.openAccommodationBooking); the button's label/state comes from
 * auth-service.js accommodationState(). Hero/cards/CTA reuse privacy-policy.css;
 * page styles live in m-pages.css (.m-accom-root); FAQ rows reuse m-home.css.
 * ============================================================================
 */
import { a as setHead, __tla as o } from "./app-main.js";
import { k as defineComponent, H as openBlock, F as createBlock, M as h, E as onMounted, o as onBeforeUnmount } from "./vue-runtime.js";
import { FEST_CONFIG, escapeHtml as esc } from "./fest-config.js";
import { subscribeAuthState, accommodationState } from "./auth-service.js";
// Loads the shared checkout so booking works when this page is opened directly.
import { openAccommodationBooking } from "./events-page.js";

const FALLBACK = { state: "soon", label: "BOOKING OPENS SOON" };
const INACTIVE = new Set(["soon", "closed", "booked"]);

function bookState() {
  try {
    const s = accommodationState?.();
    if (s && s.label) return s;
  } catch {}
  return FALLBACK;
}

const svg = (d) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  stay: svg('<path d="M3 20V8M3 14h18v6M21 20v-6a3 3 0 0 0-3-3h-8v3"/><circle cx="6.5" cy="11" r="1.5"/>'),
  meals: svg('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7h3"/>'),
  dates: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  price: svg('<path d="M7 5h10M7 9h10M7 5c5 0 6 8 0 8l7 7"/>'),
  pass: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
};
// Lucide ChevronDown, same as the home FAQ.
const CHEVRON =
  '<svg class="sgfm-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function buttonHtml() {
  const s = bookState();
  const off = INACTIVE.has(s.state);
  return `<button type="button" class="m-accom-book${off ? " is-off" : ""}" data-accom-book data-state="${esc(s.state)}"${off ? ' aria-disabled="true"' : ""}>${esc(s.label)}</button>`;
}

function buildHtml() {
  const mail = esc(FEST_CONFIG.contactEmail);
  const included = [
    ["stay", "Stay", "All three fest nights on the HPTU Hamirpur campus."],
    ["meals", "Meals", "Breakfast, lunch and dinner."],
    ["dates", "Check in / out", "29 Oct evening → 1 Nov."],
    ["pass", "Booking pass", "A QR pass in your profile, shown at check-in."],
  ];
  const steps = [
    ["Sign in", "Use your Chaitanya 2k26 account."],
    ["Register for an event", 'Pick any event on the <a href="/events">events page</a>.'],
    ["Book accommodation and pay", "Add it to the cart with your event or on its own later."],
    ["Show your booking pass", "Show the pass QR at check-in."],
  ];
  const faq = [
    ["Is food included?", "Yes — breakfast, lunch and dinner during the stay."],
    ["Can I book without an event?", "No — register for at least one event first; you can add both to the cart."],
    ["Can I cancel?", `Contact the fest team at <a href="mailto:${mail}">${mail}</a>.`],
    ["Where do I check in?", "At the fest help desk on campus; details will be shared with your booking."],
  ];

  return `
    <div class="privacy-container m-page m-accom">
      <div class="privacy-hero m-accom-hero">
        <div>
          <span class="privacy-tag-badge">Chaitanya 2k26 · HPTU Hamirpur</span>
          <h1>Accommodation</h1>
          <p class="subtitle">Stay on campus for all three fest nights — meals included.</p>
        </div>
      </div>

      <section class="m-accom-block" aria-labelledby="accom-inc">
        <h2 class="m-h" id="accom-inc">What's included</h2>
        <ul class="m-accom-grid">${included
          .map(([k, t, d]) => `<li class="m-accom-card">${ICONS[k]}<strong>${t}</strong><p>${d}</p></li>`)
          .join("")}</ul>
      </section>

      <div class="m-accom-two">
        <section class="m-accom-block" aria-labelledby="accom-who">
          <h2 class="m-h" id="accom-who">Who can book</h2>
          <ul class="m-accom-list">
            <li>Registered participants of at least one Chaitanya 2k26 event.</li>
            <li>One booking per person.</li>
            <li>Carry your college ID and a government photo ID at check-in.</li>
          </ul>
        </section>

        <section class="m-accom-block" aria-labelledby="accom-how">
          <h2 class="m-h" id="accom-how">How to book</h2>
          <ol class="m-accom-steps">${steps
            .map(([t, d], i) => `<li><span aria-hidden="true">${i + 1}</span><div><strong>${t}</strong><p>${d}</p></div></li>`)
            .join("")}</ol>
        </section>
      </div>

      <section class="m-accom-block m-accom-faq" aria-labelledby="accom-faq">
        <h2 class="m-h" id="accom-faq">FAQ</h2>
        <div class="sgfm-faq-list">${faq
          .map(([q, a]) => `<details class="sgfm-qa" name="accom-faq"><summary><span>${esc(q)}</span>${CHEVRON}</summary><div class="sgfm-a"><p>${a}</p></div></details>`)
          .join("")}</div>
      </section>

      <!-- Price and booking come last: what you get first, then what it costs. -->
      <section class="m-accom-block m-accom-booksec" aria-labelledby="accom-book">
        <h2 class="m-h" id="accom-book">Book your stay</h2>
        <div class="m-accom-price">
          <p><b>₹999</b> <span>per person</span></p>
          <p class="m-accom-when">29 Oct – 1 Nov · 3 nights · All meals</p>
          <p class="m-accom-note">Pay by UPI at booking; the fest team confirms your payment.</p>
          <div data-accom-slot>${buttonHtml()}</div>
        </div>
      </section>

      <section class="privacy-cta-box">
        <h3>QUESTIONS ABOUT YOUR STAY?</h3>
        <p>Email <a href="mailto:${mail}" style="color:inherit;text-decoration:underline;">${mail}</a> or send a message through the contact form.</p>
        <a href="/contact-us" class="privacy-cta-btn">CONTACT US</a>
      </section>
    </div>`;
}

const router = () => document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;

function onClick(ev) {
  if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  const book = ev.target.closest && ev.target.closest("[data-accom-book]");
  if (book) {
    if (book.getAttribute("aria-disabled") === "true") return;
    if (typeof openAccommodationBooking === "function") openAccommodationBooking();
    else router()?.push("/events");
    return;
  }
  const a = ev.target.closest && ev.target.closest("a[href]");
  if (!a || a.target) return;
  const href = a.getAttribute("href");
  if (!href.startsWith("/") || href.startsWith("//") || !router()) return;
  ev.preventDefault();
  router().push(href);
}

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(() => {
    a = defineComponent({
      __name: "accommodation",
      setup() {
        try {
          const trans = document.querySelector(".transition-component");
          if (trans) {
            trans.style.display = "none";
            trans.style.opacity = "0";
          }
        } catch (e) {}

        setHead({
          title: "Chaitanya 2k26 | Accommodation",
          meta: [
            {
              name: "description",
              content: "Stay on the HPTU Hamirpur campus for all three Chaitanya 2k26 fest nights, 29 Oct – 1 Nov, with all meals: ₹999 per person.",
            },
          ],
          link: [{ rel: "canonical", href: "https://chaitanya2k26.hptu.ac.in/accommodation" }],
        });

        let unsub = null;
        onMounted(() => {
          requestAnimationFrame(() => {
            const smoother = window.ScrollSmoother?.get?.();
            if (smoother && !smoother.paused()) smoother.scrollTo(0, false);
            else window.scrollTo(0, 0);
          });
          // Sign-in / sign-out can change the booking state (e.g. "booked").
          unsub = subscribeAuthState(() => {
            const slot = document.querySelector(".m-accom-root [data-accom-slot]");
            if (slot) slot.innerHTML = buttonHtml();
          });
        });
        onBeforeUnmount(() => unsub && unsub());

        const html = buildHtml();
        return () => (
          openBlock(),
          createBlock("div", { class: "privacy-page-root m-page-root m-accom-root", onClick }, [
            h("div", { class: "privacy-page-wrapper", innerHTML: html }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
