/**
 * ============================================================================
 * Chaitanya 2k26 — Events Page Component & Interactive Controller
 * ============================================================================
 * - /events layout with hero, sticky category toolbar and live search
 * - Event details drawer (fee, deadline, registration type, team size, heads)
 * - REGISTER: one event → checkout (confirm details → team → review & pay → done)
 * - Cart (icon buttons): collect several events, pick solo/team, register all
 * - Join an existing team with a code
 */

import {
  getEventById,
  getEventCatalog,
  getCategories,
  filterEvents,
  isRegistrationOpen,
  isPastDeadline,
  formatDeadline,
  feeLabel,
  ACCOMMODATION,
} from "./events-data.js";

import {
  getCurrentUser,
  subscribeAuthState,
  checkoutCart,
  validateCheckout,
  payWithRazorpay,
  joinTeamWithCode,
  isEventRegistered,
  isRegisteredForAnyEvent,
  accommodationState,
  YEAR_OPTIONS,
} from "./auth-service.js";

import {
  getCartItems,
  getCartTotal,
  addToCart,
  removeFromCart,
  setCartItemMode,
  clearCart,
  isInCart,
  setCartOwner,
  subscribeCart,
} from "./cart.js";

import { openAuthModal } from "./auth-modal.js";
import { organiserFor } from "./teams-data.js";
import { registrationQrHtml } from "./profile-panel.js";

import {
  FEST_CONFIG,
  getFestDatesLabel,
  isPaymentConfigured,
  isRazorpayEnabled,
  buildUpiLink,
  escapeHtml as e,
} from "./fest-config.js";

const UTR_PATTERN = /^\d{12}$/;

// Paid checkouts go through Razorpay when it's switched on (UPI + UTR otherwise).
// co.paidId: Razorpay already took the money but the save hasn't succeeded yet,
// so the button only retries the save (never charges twice).
// Fees are per person: a team line costs the fee × its size (leader + named
// members). Before the team step is filled in, the size is the event minimum.
const lineAmount = ({ event: ev, mode, amount }) => {
  if (mode !== "team") return amount;
  const members = checkout?.teams?.[ev.id]?.members;
  return amount * (members ? Math.max(members.filter((m) => m.name).length + 1, ev.minTeam) : ev.minTeam);
};
const lineTotal = (items) => items.reduce((sum, i) => sum + lineAmount(i), 0);
const useRazorpay = (total) => total > 0 && isRazorpayEnabled();
const reviewSubmitLabel = (co, total) =>
  co.paidId ? "RETRY SAVING REGISTRATION" : useRazorpay(total) ? `PAY ₹${total} WITH RAZORPAY` : "CONFIRM REGISTRATION";

// Category + search survive a reload of /events (same tab).
const FILTERS_KEY = "chaitanya-events-filters";
let { cat: activeCategory = "all", q: activeSearchQuery = "" } = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(FILTERS_KEY)) || {};
  } catch {
    return {};
  }
})();
function saveFilters() {
  try {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ cat: activeCategory, q: activeSearchQuery }));
  } catch {}
}
let isDossierOpen = false;
let isCartOpen = false;
let isCheckoutOpen = false;
let resumeCheckoutUntil = 0; // resume checkout only if sign-in completes soon after "Done"
let resumeOnlyId = null; // the one event a direct REGISTER was checking out (null = the cart)
let lastAuthUid = null; // to spot a sign-out (see subscribeAuthState)
let globalListenersBound = false;

// No cart: one event → REGISTER → checkout. The details drawer gets its own
// URL (/events/<id>) so the back button closes it.
const getRouter = () => document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
const DEEP_LINK = /^\/events\/([^/?#]+)/;
const EVENTS_PATH = /^\/events\/?$/;
let dossierEventId = null;
let routerHooked = false;
let skipCloseNav = false; // closing the drawer to follow a link: leave the URL alone
// Checkout wizard state
let checkout = null;
// The checkout whose register/join request is in flight; blocks double submits and closing mid-request.
let submitting = null;
// Survives the tab reload phones do while the student is away in a UPI app.
const CHECKOUT_DRAFT_KEY = "chaitanya-checkout-draft";

// ----------------------------------------------------------------------------
// DIALOG PLUMBING (details drawer, cart drawer, checkout modal)
// One dialog is open at a time. Opening one: remember what had focus, make the
// rest of the page inert, move focus inside. Tab/Shift+Tab wrap inside it
// (see bindGlobalListeners). Closing: un-inert and give focus back.
// ----------------------------------------------------------------------------
const DIALOGS = {
  dossier: { overlay: "event-dossier-overlay", panel: "event-dossier-panel", title: "#event-dossier-title" },
  cart: { overlay: "events-cart-overlay", panel: "events-cart-panel", title: "#events-cart-title" },
  checkout: { overlay: "event-reg-modal", panel: "event-reg-card", title: "#co-title" },
};
let activeDialog = null; // key of DIALOGS
const dialogReturnFocus = {};
let inertedEls = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(el) {
  return Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => !n.closest("[hidden]") && n.getClientRects().length > 0);
}

// Inert every other child of <body> (the page under #__nuxt, the cart button,
// the HUD, other overlays). The toast stays live so it is still announced.
function setBackgroundInert(overlay) {
  inertedEls.forEach((el) => el.removeAttribute("inert"));
  inertedEls = [];
  if (!overlay || overlay.parentElement !== document.body) return;
  Array.from(document.body.children).forEach((el) => {
    if (el === overlay || el.id === "events-toast" || el.hasAttribute("inert")) return;
    if (/^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) return;
    el.setAttribute("inert", "");
    inertedEls.push(el);
  });
}

function focusInto(panel, preferred) {
  let target = null;
  try {
    target = (preferred && panel.querySelector(preferred)) || null;
  } catch {}
  target = target || focusablesIn(panel)[0] || panel;
  if (target === panel && !panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

// A selector for the focused control inside `panel`, so it can be refocused
// after the panel's HTML is re-rendered.
function focusedSelector(panel) {
  const a = document.activeElement;
  if (!a || a === panel || !panel.contains(a)) return null;
  if (a.id) return `#${CSS.escape(a.id)}`;
  const d = a.dataset || {};
  if (!d.action) return null;
  let sel = `[data-action="${CSS.escape(d.action)}"]`;
  if (d.eventId) sel += `[data-event-id="${CSS.escape(d.eventId)}"]`;
  if (d.mode) sel += `[data-mode="${CSS.escape(d.mode)}"]`;
  if (d.index) sel += `[data-index="${CSS.escape(d.index)}"]`;
  return sel;
}

function activateDialog(key, preferredFocus) {
  const cfg = DIALOGS[key];
  const overlay = document.getElementById(cfg.overlay);
  const panel = document.getElementById(cfg.panel);
  if (!overlay || !panel) return;
  if (activeDialog !== key) {
    const prev = document.activeElement;
    dialogReturnFocus[key] = prev && prev !== document.body && !overlay.contains(prev) ? prev : null;
    activeDialog = key;
  }
  setBackgroundInert(overlay);
  focusInto(panel, preferredFocus || cfg.title);
}

function deactivateDialog(key) {
  if (activeDialog !== key) return;
  activeDialog = null;
  setBackgroundInert(null);
  const back = dialogReturnFocus[key];
  dialogReturnFocus[key] = null;
  let target = back && back.isConnected && !back.closest("[inert]") ? back : null;
  // The opener may have been re-rendered (the grid refreshes on sign-in).
  if (!target && back?.dataset?.eventId) {
    target = document.querySelector(
      `#events-card-grid .event-card[data-event-id="${CSS.escape(back.dataset.eventId)}"] .event-btn-details`
    );
  }
  if (!target) target = document.getElementById("events-cart-fab");
  try {
    target?.focus({ preventScroll: true });
  } catch {}
}

function trapTab(evt) {
  const panel = document.getElementById(DIALOGS[activeDialog]?.panel);
  if (!panel) return;
  const items = focusablesIn(panel);
  const cur = document.activeElement;
  if (!items.length) {
    evt.preventDefault();
    focusInto(panel);
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (!panel.contains(cur)) {
    evt.preventDefault();
    (evt.shiftKey ? last : first).focus();
  } else if (evt.shiftKey) {
    if (cur === first || first.compareDocumentPosition(cur) & Node.DOCUMENT_POSITION_PRECEDING) {
      evt.preventDefault();
      last.focus();
    }
  } else if (cur === last || last.compareDocumentPosition(cur) & Node.DOCUMENT_POSITION_FOLLOWING) {
    evt.preventDefault();
    first.focus();
  }
}

function isOtherOverlayOpen() {
  // The profile overlay / auth modal (other modules) handle their own keys.
  return (
    document.documentElement.classList.contains("pp-open") ||
    Boolean(document.querySelector("dialog[open]")) || // e.g. the leave-registration confirm
    Boolean(document.getElementById("chaitanya-auth-backdrop")?.classList.contains("active"))
  );
}

const totalEvents = () => getCategories().find((c) => c.id === "all")?.count || "";

/**
 * Generate HTML for the complete Events Page
 */
export function renderEventsPageHtml() {
  const categories = getCategories();
  const events = filterEvents(activeCategory, activeSearchQuery);

  const categoriesHtml = categories
    .map(
      (cat) => `
      <button type="button" class="events-cat-btn ${activeCategory === cat.id ? "active" : ""}" aria-pressed="${activeCategory === cat.id}" data-cat="${e(cat.id)}" style="--tint: ${cat.accent || "var(--ink)"}">
        ${e(cat.name)}
        <span class="cat-count">${cat.count}</span>
      </button>
    `
    )
    .join("");

  return `
    <div class="events-page-root" id="chaitanya-events-page">
      <div id="events-scroll-progress"></div>

      <div class="events-container">
        <div class="events-m-head">
          <h1>Events</h1>
          <p>${e(totalEvents())} events · ${e(getFestDatesLabel().replace(/\s*\d{4}$/, ""))} · HPTU Hamirpur</p>
        </div>

        <div class="events-toolbar">
          <div class="events-categories" id="events-cat-bar">${categoriesHtml}</div>
          <div class="events-search-wrap" role="search">
            <svg class="events-search-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" class="events-search-input" id="events-search-box"
              placeholder="Search events, places, student heads..." value="${e(activeSearchQuery)}" aria-label="Search events" />
            <button type="button" class="events-search-clear ${activeSearchQuery ? "active" : ""}" id="events-search-clear-btn" aria-label="Clear search">✕</button>
          </div>
        </div>

        <div class="events-stay" id="events-stay">${stayBannerHtml()}</div>

        <div class="events-grid" id="events-card-grid">${renderGridHtml(events)}</div>
      </div>

      <div class="events-scroll-hud" id="events-scroll-hud">
        <div class="events-scroll-metric">
          <span class="pulse-dot"></span>
          <span id="events-scroll-counter">${e(totalEvents())} EVENTS</span>
        </div>
        <button type="button" class="events-scroll-top-btn" id="events-scroll-top-btn" title="Back to top">↑ TOP</button>
      </div>

      <button type="button" class="events-cart-fab" id="events-cart-fab" aria-haspopup="dialog" aria-label="Cart, 0 events" title="Cart">
        ${CART_ICON}
        <span class="events-cart-fab-count" id="events-cart-count" aria-hidden="true">0</span>
      </button>

      <div class="event-dossier-overlay" id="event-dossier-overlay">
        <div class="event-dossier-panel" id="event-dossier-panel" role="dialog" aria-modal="true" aria-labelledby="event-dossier-title"></div>
      </div>

      <div class="events-cart-overlay" id="events-cart-overlay">
        <aside class="events-cart-panel" id="events-cart-panel" role="dialog" aria-modal="true" aria-labelledby="events-cart-title"></aside>
      </div>

      <div class="event-reg-modal" id="event-reg-modal">
        <div class="event-reg-card" id="event-reg-card" role="dialog" aria-modal="true" aria-labelledby="co-title"></div>
      </div>
    </div>
  `;
}

// Accommodation strip above the grid: not an event card, not filtered or counted.
function stayBannerHtml() {
  const { state, label } = accommodationState();
  const status = ["booked", "soon", "closed"].includes(state) ? `<span class="events-stay-status">${e(label)}</span>` : "";
  const cart = ["open", "needs-event"].includes(state) ? cartToggleHtml(ACCOMMODATION) : "";
  return `
    <div class="events-stay-text">
      <strong>Stay on campus — ₹${e(ACCOMMODATION.entryFeeNum)} with meals</strong>
      <span>${e(ACCOMMODATION.date)} · all three fest nights · breakfast &amp; dinner</span>
    </div>
    <div class="events-stay-actions">
      ${status}
      <a class="events-stay-link" href="/accommodation" data-action="route-link">View accommodation</a>
      ${cart}
    </div>`;
}

function renderGridHtml(events) {
  return events.length
    ? events.map((ev) => renderEventCardHtml(ev)).join("")
    : `
      <div class="events-empty">
        <h3>No events found</h3>
        <p>Try another category or clear the search box.</p>
      </div>
    `;
}

// The details drawer's action, by state: REGISTER checks out just this event.
function actionButtonHtml(ev) {
  const cls = "event-submit-btn event-action-large";
  if (isEventRegistered(ev.id)) {
    return `<button type="button" class="${cls} registered" data-action="view-booking" data-event-id="${e(ev.id)}">✓ REGISTERED</button>`;
  }
  if (isRegistrationOpen(ev)) {
    return `<button type="button" class="${cls}" data-action="register-now" data-event-id="${e(ev.id)}">REGISTER</button>`;
  }
  const label = isPastDeadline(ev) ? "REGISTRATION CLOSED" : "REGISTRATION SOON";
  return `<button type="button" class="${cls} is-closed" disabled aria-disabled="true">${label}</button>`;
}

const svg = (d) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// Lucide "shopping-cart"; the toggle adds a plus (add) or a check (added).
const CART_PATH = `<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>`;
const CART_ICON = svg(CART_PATH);
const CART_ADD_ICON = svg(`${CART_PATH}<path d="M14 8v5M11.5 10.5h5"/>`);
const CART_ADDED_ICON = svg(`${CART_PATH}<path d="m11.5 10.5 2 2 3.5-3.5"/>`);

// Icon-only add/remove-from-cart toggle (cards and the drawer). Registered or
// closed events get none.
function cartToggleHtml(ev) {
  if (isEventRegistered(ev.id) || !isRegistrationOpen(ev)) return "";
  const added = isInCart(ev.id);
  return `<button type="button" class="event-cart-toggle${added ? " is-added" : ""}" data-action="toggle-cart" data-event-id="${e(ev.id)}" ${cartToggleAttrs(ev, added)}>${added ? CART_ADDED_ICON : CART_ADD_ICON}</button>`;
}

function cartToggleAttrs(ev, added) {
  const label = `${added ? "Remove" : "Add"} ${e(ev.title)} ${added ? "from" : "to"} cart`;
  return `aria-pressed="${added}" aria-label="${label}" title="${added ? "Remove from cart" : "Add to cart"}"`;
}

const HERO_ICONS = {
  events: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
  date: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  venue: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
};

// Event poster (images/events/<id>.webp, see POSTERS in events-data.js). The
// poster carries the event name, so it replaces the number / glyph overlays.
const posterImg = (ev, { eager = false } = {}) =>
  `<img class="event-poster" src="${e(ev.poster)}" alt="${e(ev.title)} poster" width="900" height="900" decoding="async"${eager ? "" : ' loading="lazy"'}>`;

// One glyph per category: the visual identity of events without a poster.
const CATEGORY_ICONS = {
  tech: svg('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>'),
  innovation: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>'),
  business: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  esports: svg('<path d="M7 9h4M9 7v4M15 10h.01M18 8h.01"/><path d="M6.5 5h11A4.5 4.5 0 0 1 22 9.5v4.3a3.2 3.2 0 0 1-5.6 2.1L15 14H9l-1.4 1.9A3.2 3.2 0 0 1 2 13.8V9.5A4.5 4.5 0 0 1 6.5 5Z"/>'),
  cultural: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
};

const CHIP_ICONS = {
  date: HERO_ICONS.date,
  team: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'),
};

function renderEventCardHtml(ev) {
  const catObj = getCategories().find((c) => c.id === ev.category);
  const accentColor = catObj?.accent || "var(--ink)";
  // Stable number from the catalogue order, so a card keeps it under any filter.
  const number = String(getEventCatalog().indexOf(ev) + 1).padStart(2, "0");
  const flagship = ev.badge && ev.badge !== ev.categoryName ? ev.badge : "";
  const teamChip = ev.registrationType === "solo" ? "SOLO" : ev.registrationType === "team" ? `TEAM ${ev.teamSize}` : `SOLO / TEAM`;

  return `
    <div class="event-card${isEventRegistered(ev.id) ? " is-registered" : isInCart(ev.id) ? " is-added" : ""}" data-event-id="${e(ev.id)}" style="--cat:${accentColor};">

      <button type="button" class="event-card-visual${ev.poster ? " has-poster" : ""}"${ev.posterBg ? ` style="--poster-bg: url('${e(ev.posterBg)}')"` : ""} aria-haspopup="dialog" tabindex="-1" data-action="view-details" data-event-id="${e(ev.id)}" aria-label="View details: ${e(ev.title)}">
        ${
          ev.poster
            ? posterImg(ev)
            : `<span class="event-visual-num" aria-hidden="true">${number}</span>
        <span class="event-visual-icon">${CATEGORY_ICONS[ev.category] || ""}</span>
        ${flagship ? `<span class="event-visual-flag">${e(flagship)}</span>` : ""}`
        }
      </button>

      <div class="event-card-body">
        <span class="event-badge-category">${e(ev.categoryName)}</span>
        <h2 class="event-card-title" title="${e(ev.title)}">${e(ev.title)}</h2>
        <p class="event-card-tagline" title="${e(ev.tagline)}">${e(ev.tagline)}</p>


        <ul class="event-card-chips" aria-label="Key details">
          <li class="event-chip">${CHIP_ICONS.date}${e(ev.date)}</li>
          <li class="event-chip">${CHIP_ICONS.team}${e(teamChip)}</li>
        </ul>

        <div class="event-card-actions">
          <button type="button" class="event-btn-details" aria-haspopup="dialog" data-action="view-details" data-event-id="${e(ev.id)}">VIEW DETAILS</button>
          ${cartToggleHtml(ev)}
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// DETAILS DRAWER
// ----------------------------------------------------------------------------

// Accommodation has no details drawer (it has its own page, /accommodation).
const dossierEvent = (id) => {
  const ev = getEventById(id);
  return ev && !ev.isAccommodation ? ev : null;
};

export function openEventDossier(eventId) {
  const ev = dossierEvent(eventId);
  if (!ev) return;
  const overlay = document.getElementById("event-dossier-overlay");
  const panel = document.getElementById("event-dossier-panel");
  if (!overlay || !panel) return;

  const catObj = getCategories().find((c) => c.id === ev.category);
  const accentColor = catObj?.accent || "var(--ink)";
  const rulesHtml = (ev.rules || []).map((r) => `<li>${e(r)}</li>`).join("");
  const typeLabel = { solo: "Solo", team: "Team", both: "Solo or team" }[ev.registrationType] || "Solo";

  const coordinators = ev.coordinators || [];
  const coordinatorsHtml = coordinators.length
    ? coordinators
        .map(
          (c) => `
      <div class="event-coordinator-card">
        <div class="event-coord-info">
          <span class="event-coord-name">${e(c.name)}</span>
          <span class="event-coord-role">${e(c.role)}</span>
        </div>
        <div class="event-coord-actions">
          <a href="mailto:${e(FEST_CONFIG.contactEmail)}?subject=${encodeURIComponent(`${ev.title} (attn: ${c.name})`)}" class="event-coord-btn">✉ EMAIL</a>
        </div>
      </div>`
        )
        .join("")
    : `
      <div class="event-coordinator-card">
        <div class="event-coord-info">
          <span class="event-coord-name">Chaitanya 2k26 Organising Committee</span>
          <span class="event-coord-role">Student heads will be announced soon</span>
        </div>
        <div class="event-coord-actions">
          <a href="mailto:${e(FEST_CONFIG.contactEmail)}?subject=${encodeURIComponent(`Query: ${ev.title}`)}" class="event-coord-btn">✉ EMAIL</a>
        </div>
      </div>`;

  const canJoin = ev.registrationType !== "solo" && isRegistrationOpen(ev) && !isEventRegistered(ev.id);

  const roundsHtml = (ev.rounds || [])
    .map(
      (r) => `
      <div class="event-round">
        <div class="event-round-head"><strong>${e(r.name)}</strong><span>${e(r.time)}</span></div>
        <p>${e(r.description)}</p>
      </div>`
    )
    .join("");
  const scoringHtml = (ev.judgingCriteria || [])
    .map((c) => `<div class="event-score-row"><span>${e(c.name)}</span><strong>${e(c.weight)}</strong></div>`)
    .join("");
  // Visual, title, tagline, when/where, REGISTER, then the detail sections.
  const number = String(getEventCatalog().indexOf(ev) + 1).padStart(2, "0");
  const flagship = ev.badge && ev.badge !== ev.categoryName ? ev.badge : "";
  const org = organiserFor(ev);
  const heads = coordinators.map((c) => e(c.name)).join(", ");
  let n = 0;
  const no = () => String(++n).padStart(2, "0");
  const section = (title, inner) => `
  <div class="event-dossier-section">
    <h3 class="event-dossier-heading">${no()}. ${title}</h3>
    ${inner}
  </div>`;
  panel.innerHTML = `
  <div class="event-dossier-mbar">
    <button type="button" class="event-dossier-back" data-action="dossier-back">← All events</button>
    <button type="button" class="event-dossier-close" id="dossier-close-btn" aria-label="Close"><span class="m-x" aria-hidden="true">✕</span></button>
  </div>
  <div class="event-dossier-visual${ev.poster ? " has-poster" : ""}" style="--cat:${accentColor};${ev.posterBg ? ` --poster-bg: url('${e(ev.posterBg)}');` : ""}">
    ${
      ev.poster
        ? posterImg(ev, { eager: true })
        : `<span class="event-visual-num" aria-hidden="true">${number}</span>
    <span class="event-visual-icon">${CATEGORY_ICONS[ev.category] || ""}</span>
    ${flagship ? `<span class="event-visual-flag">${e(flagship)}</span>` : ""}`
    }
  </div>
  <span class="event-dossier-kicker" style="color:${accentColor};">${e(ev.categoryName)}</span>
  <h2 class="event-dossier-title" id="event-dossier-title" tabindex="-1">${e(ev.title)}</h2>
  <p class="event-dossier-tagline">${e(ev.tagline)}</p>
  <dl class="event-dossier-facts">
    <div><dt>DATE · TIME</dt><dd>${e(ev.date)} · ${e(ev.time)}</dd></div>
    <div><dt>VENUE</dt><dd>${e(ev.venue)}</dd></div>
  </dl>
  <div class="event-dossier-cta">
    <div class="event-cta-row">${actionButtonHtml(ev)}${cartToggleHtml(ev)}</div>
    ${canJoin ? `<button type="button" class="event-link-btn" data-action="join-team" data-event-id="${e(ev.id)}">Have a team code? Join your team</button>` : ""}
  </div>
  ${section("ABOUT", `<p class="event-dossier-text">${e(ev.overview)}</p>`)}
  ${rulesHtml ? section("RULES", `<ul class="event-dossier-list">${rulesHtml}</ul>`) : ""}
  ${roundsHtml ? section("ROUNDS", `<div class="event-rounds">${roundsHtml}</div>`) : ""}
  ${scoringHtml ? section(ev.id === "esports-bgmi" ? "SCORING" : "HOW WE JUDGE", `<div class="event-scoring">${scoringHtml}</div>`) : ""}
  ${section("WHO CAN TAKE PART", `
    <dl class="event-dossier-facts">
      <div><dt>REGISTRATION</dt><dd>${e(typeLabel)}</dd></div>
      <div><dt>TEAM SIZE</dt><dd>${ev.registrationType === "solo" ? "1 (solo)" : `${e(ev.minTeam)}–${e(ev.maxTeam)} members`}</dd></div>
      <div><dt>REGISTER BY</dt><dd>${e(formatDeadline(ev))}</dd></div>
      <div><dt>FEE</dt><dd>${e(feeLabel(ev))}</dd></div>
      <div><dt>PRIZES</dt><dd>${e(ev.prizePool)}</dd></div>
    </dl>`)}
  ${section("ORGANISED BY", `
    <p class="event-dossier-text"><a class="event-org-link" href="${e(org.href)}" data-action="org-link">${e(org.name)} →</a></p>
    <p class="event-dossier-text">${heads ? `Student heads: ${heads}` : "Student heads will be announced soon"}</p>`)}
  ${section("CONTACT", `<div>${coordinatorsHtml}</div>`)}
`;

  const wasOpen = isDossierOpen && activeDialog === "dossier";
  overlay.classList.add("active");
  // A new event always starts at its title. Reset once the panel is shown
  // (and again on its first frame: iOS can carry momentum from a fling that
  // was still running when the previous event was closed).
  if (!wasOpen) {
    panel.scrollTop = 0;
    requestAnimationFrame(() => panel.isConnected && (panel.scrollTop = 0));
  }
  isDossierOpen = true;
  dossierEventId = ev.id;
  panel.querySelector("#dossier-close-btn").onclick = () => closeEventDossier();
  activateDialog("dossier");
}

export function closeEventDossier() {
  document.getElementById("event-dossier-overlay")?.classList.remove("active");
  isDossierOpen = false;
  dossierEventId = null;
  deactivateDialog("dossier");
  // Left /events/<id>: step back to /events if that's the previous entry (so
  // the phone's back button doesn't reopen it), else swap the URL in place.
  if (skipCloseNav || !DEEP_LINK.test(location.pathname)) return;
  const router = getRouter();
  if (!router) return;
  const prev = history.state?.back;
  if (typeof prev === "string" && EVENTS_PATH.test(prev.split(/[?#]/)[0])) router.back();
  else router.replace("/events");
}

// A card opens its details at /events/<id>.
function openDossierFromCard(id) {
  openEventDossier(id);
  const router = getRouter();
  const path = `/events/${encodeURIComponent(id)}`;
  if (isDossierOpen && router && location.pathname !== path) router.push(path);
}

// Keeps the drawer in step with the URL: back/forward open or close it.
function hookRouter() {
  const router = getRouter();
  if (!router || routerHooked) return;
  routerHooked = true;
  router.afterEach((to) => {
    if (!document.getElementById("event-dossier-overlay")) return; // not on /events
    const m = to.path.match(DEEP_LINK);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (!dossierEvent(id)) return router.replace("/events");
      if (!isDossierOpen || dossierEventId !== id) openEventDossier(id);
    } else if (EVENTS_PATH.test(to.path) && isDossierOpen) {
      closeEventDossier();
    }
  });
}

// REGISTER: check out just this event. The cart is left as it is.
function handleRegisterNow(eventId) {
  const ev = getEventById(eventId);
  if (!ev || isEventRegistered(ev.id) || !isRegistrationOpen(ev)) return;
  // Close first: the open drawer would make the sign-in modal inert.
  closeEventDossier();
  startCheckout(ev.id);
}

// ----------------------------------------------------------------------------
// CART
// ----------------------------------------------------------------------------

function renderCartPanel() {
  const panel = document.getElementById("events-cart-panel");
  if (!panel) return;
  const keepFocus = focusedSelector(panel);
  const items = getCartItems();
  const total = lineTotal(items);
  const from = items.some((i) => i.mode === "team" && i.amount) ? "FROM " : "";

  const rows = items
    .map(({ event: ev, mode, amount }) => {
      const typeControl =
        ev.registrationType === "both"
          ? `<div class="cart-mode" role="group" aria-label="Solo or team for ${e(ev.title)}">
               <button type="button" class="${mode === "solo" ? "active" : ""}" aria-pressed="${mode === "solo"}" data-action="cart-mode" data-mode="solo" data-event-id="${e(ev.id)}">SOLO</button>
               <button type="button" class="${mode === "team" ? "active" : ""}" aria-pressed="${mode === "team"}" data-action="cart-mode" data-mode="team" data-event-id="${e(ev.id)}">TEAM</button>
             </div>`
          : `<span class="cart-type">${ev.registrationType === "team" ? `TEAM · ${e(ev.minTeam)}–${e(ev.maxTeam)}` : "SOLO"}</span>`;
      return `
        <li class="cart-item">
          <div class="cart-item-main">
            <strong>${e(ev.title)}</strong>
            <span>${e(ev.date)} · ${e(ev.time)}</span>
            ${typeControl}
          </div>
          <div class="cart-item-side">
            <span class="cart-amount">${amount ? `₹${e(amount)}${mode === "team" ? " / person" : ""}` : "FREE"}</span>
            <button type="button" class="cart-remove" data-action="cart-remove" data-event-id="${e(ev.id)}" aria-label="Remove ${e(ev.title)} from cart">REMOVE</button>
          </div>
        </li>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="cart-head">
      <h3 id="events-cart-title" tabindex="-1">YOUR CART</h3>
      <button type="button" class="cart-close" data-action="cart-close" aria-label="Close cart"><span class="m-x" aria-hidden="true">✕</span></button>
    </div>
    ${items.length
      ? `<ul class="cart-list">${rows}</ul>
         <div class="cart-foot">
           <div class="cart-total"><span>${items.length} EVENT${items.length > 1 ? "S" : ""}</span><strong>TOTAL ${total ? `${from}₹${e(total)}` : "FREE"}</strong></div>
           <button type="button" class="event-submit-btn cart-done" data-action="cart-done">REGISTER</button>
         </div>`
      : `<div class="cart-empty"><p>Your cart is empty.</p><p>Tap the cart button on an event to add it.</p></div>`}
  `;
  // Re-rendered while open (remove / solo-team switch): keep keyboard focus.
  if (activeDialog === "cart" && !panel.contains(document.activeElement)) focusInto(panel, keepFocus || DIALOGS.cart.title);
}

// Cart changed: update the floating button, every toggle and card in place
// (no re-render, so focus stays put), and the open drawer.
function syncCartUi(items = getCartItems()) {
  const count = document.getElementById("events-cart-count");
  const fab = document.getElementById("events-cart-fab");
  if (count) count.textContent = String(items.length);
  if (fab) {
    fab.classList.toggle("has-items", items.length > 0);
    fab.setAttribute("aria-label", `Cart, ${items.length} event${items.length === 1 ? "" : "s"}`);
  }
  const ids = new Set(items.map((i) => i.eventId));
  document.querySelectorAll(".event-cart-toggle[data-event-id]").forEach((btn) => {
    const ev = getEventById(btn.dataset.eventId);
    const added = ids.has(btn.dataset.eventId);
    if (!ev || btn.classList.contains("is-added") === added) return;
    btn.classList.toggle("is-added", added);
    btn.setAttribute("aria-pressed", String(added));
    btn.setAttribute("aria-label", `${added ? "Remove" : "Add"} ${ev.title} ${added ? "from" : "to"} cart`);
    btn.title = added ? "Remove from cart" : "Add to cart";
    btn.innerHTML = added ? CART_ADDED_ICON : CART_ADD_ICON;
  });
  document.querySelectorAll("#events-card-grid .event-card:not(.is-registered)").forEach((card) => {
    card.classList.toggle("is-added", ids.has(card.dataset.eventId));
  });
  if (isCartOpen) renderCartPanel();
}

export function openCart() {
  renderCartPanel();
  const overlay = document.getElementById("events-cart-overlay");
  if (!overlay) return;
  overlay.classList.add("active");
  isCartOpen = true;
  activateDialog("cart");
}

export function closeCart() {
  document.getElementById("events-cart-overlay")?.classList.remove("active");
  isCartOpen = false;
  deactivateDialog("cart");
}

function handleToggleCart(eventId) {
  const ev = getEventById(eventId);
  if (!ev) return;
  if (ev.isAccommodation && !isInCart(ev.id)) {
    const { state } = accommodationState();
    if (!["open", "needs-event"].includes(state)) return flashToast(ACCOMMODATION_TOASTS[state]);
  }
  if (isInCart(ev.id)) {
    removeFromCart(ev.id);
    return flashToast(`${ev.title} removed from cart`);
  }
  try {
    addToCart(ev.id);
    flashToast(`${ev.title} added to cart`);
  } catch (err) {
    flashToast(err.message);
  }
}

// The toast is a polite live region. It is created (empty) when the page
// mounts so screen readers are already watching it before the first message.
function ensureToast() {
  let toast = document.getElementById("events-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "events-toast";
    toast.className = "events-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    document.body.appendChild(toast);
  }
  return toast;
}

function flashToast(message) {
  const toast = ensureToast();
  // Clear first so the same message twice in a row is announced again.
  toast.textContent = "";
  clearTimeout(flashToast._a);
  flashToast._a = setTimeout(() => (toast.textContent = message), 50);
  toast.classList.add("show");
  clearTimeout(flashToast._t);
  flashToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ----------------------------------------------------------------------------
// CHECKOUT (details → teams → review & pay → done)
// ----------------------------------------------------------------------------

// Checks out the whole cart, or (direct REGISTER) only `onlyId` without
// touching the rest of the cart.
function startCheckout(onlyId = null) {
  let items = getCartItems();
  if (onlyId) {
    const ev = getEventById(onlyId);
    if (!ev || isEventRegistered(ev.id) || !isRegistrationOpen(ev)) return;
    const mode = ev.registrationType === "team" ? "team" : "solo";
    items = [items.find((i) => i.eventId === ev.id) || { eventId: ev.id, mode, event: ev, amount: Number(ev.entryFeeNum) || 0 }];
  }
  if (!items.length) return;
  const user = getCurrentUser();
  if (!user) {
    resumeCheckoutUntil = Date.now() + 3 * 60 * 1000;
    resumeOnlyId = onlyId;
    closeCart();
    openAuthModal("login");
    return;
  }
  const teams = {};
  items
    .filter((i) => i.mode === "team")
    .forEach((i) => {
      teams[i.eventId] = { teamName: "", members: Array.from({ length: Math.max(i.event.minTeam - 1, 0) }, () => ({ name: "", email: "" })) };
    });
  checkout = {
    step: "details",
    items,
    teams,
    details: {
      displayName: user.displayName || "",
      college: user.college || "",
      year: user.year || "",
      phone: user.phone || "",
    },
    utr: "",
    result: null,
    joinEventId: null,
    only: onlyId,
  };
  const draft = readCheckoutDraft();
  // Only the student who started it gets it back (shared computers, e.g. a registration desk).
  if (draft?.cartKey === cartKey(items) && draft.uid === user.uid) {
    Object.assign(checkout, { step: draft.step, teams: draft.teams, details: draft.details, utr: draft.utr });
    if (draft.paidId) checkout.paidId = draft.paidId;
  }
  closeCart();
  openCheckoutModal();
}

function openJoinTeam(eventId) {
  const user = getCurrentUser();
  if (!user) {
    // Close the drawer first: it makes the rest of the page (and the sign-in
    // modal) inert while open.
    closeEventDossier();
    // Come back to the join form once signed in, like "Register" resumes checkout.
    openAuthModal("login", { afterSignIn: () => openJoinTeam(eventId) });
    return;
  }
  const ev = getEventById(eventId);
  if (!ev) return;
  checkout = {
    step: "join",
    items: [],
    teams: {},
    details: { displayName: user.displayName || "", college: user.college || "", year: user.year || "", phone: user.phone || "" },
    joinEventId: ev.id,
  };
  closeEventDossier();
  openCheckoutModal();
}

function openCheckoutModal() {
  const modal = document.getElementById("event-reg-modal");
  if (!modal) return;
  modal.classList.add("active");
  isCheckoutOpen = true;
  renderCheckout();
  activateDialog("checkout");
}

export function closeCheckout() {
  document.getElementById("event-reg-modal")?.classList.remove("active");
  isCheckoutOpen = false;
  checkout = null;
  saveCheckoutDraft();
  deactivateDialog("checkout");
}

// Esc, backdrop and the close button: past the details step the student may
// have typed team names or already paid, so don't drop that on one keystroke.
function requestCloseCheckout() {
  if (submitting || leaveDialog) return;
  const typedUtr = document.getElementById("co-utr")?.value || checkout?.utr;
  if (checkout?.step === "teams" || (checkout?.step === "review" && (typedUtr || getCartTotal(checkout.items) > 0))) {
    const desc = checkout.paidId
      ? `Your payment went through, but your registration is not saved yet. If you leave, write down your payment ID ${checkout.paidId} and email ${FEST_CONFIG.contactEmail}.`
      : checkout.only
      ? "What you typed here will be lost."
      : "Your cart stays, but what you typed here will be lost.";
    return confirmLeave(checkout.paidId ? "Leave anyway?" : "Leave registration?", desc);
  }
  closeCheckout();
}

// Styled <dialog> (same look as the home "Open …?" confirm, .sgf-confirm in
// m-home.css) instead of window.confirm(): a native dialog steals the mouse,
// and with the system cursor hidden (html.custom-cursor-active) the page was
// left with no cursor until a click. showModal() handles inert, focus and Esc;
// the cursor CSS shows the system cursor while a dialog is open.
let leaveDialog = null;
function confirmLeave(title, desc) {
  if (leaveDialog) return;
  const dlg = document.createElement("dialog");
  dlg.className = "sgf-confirm";
  dlg.setAttribute("aria-labelledby", "co-leave-t");
  dlg.setAttribute("aria-describedby", "co-leave-d");
  dlg.innerHTML = `<div class="sgf-confirm-card">
      <h2 class="sgf-confirm-title" id="co-leave-t"></h2>
      <p class="sgf-confirm-desc" id="co-leave-d"></p>
      <div class="sgf-confirm-actions">
        <button type="button" class="sgf-confirm-stay">Stay</button>
        <button type="button" class="sgf-confirm-go">Leave</button>
      </div></div>`;
  dlg.querySelector("h2").textContent = title;
  dlg.querySelector("p").textContent = desc;
  // Settled here rather than in a "close" listener, which could arrive late
  // (or after the Esc that opened this dialog) and leave the checkout stuck.
  const finish = (leave) => {
    if (leaveDialog !== dlg) return;
    leaveDialog = null;
    dlg.close();
    dlg.remove();
    if (leave && isCheckoutOpen && !submitting) closeCheckout();
  };
  dlg.addEventListener("click", (evt) => {
    if (evt.target.closest(".sgf-confirm-go")) finish(true);
    else if (evt.target === dlg || evt.target.closest(".sgf-confirm-stay")) finish(false); // backdrop = stay
  });
  dlg.addEventListener("cancel", (evt) => {
    evt.preventDefault();
    finish(false);
  });
  // Appended after setBackgroundInert ran, so it is never inerted itself.
  document.body.appendChild(dlg);
  leaveDialog = dlg;
  dlg.showModal();
  dlg.querySelector(".sgf-confirm-stay").focus();
}

const cartKey = (items) => items.map((i) => `${i.eventId}:${i.mode}`).join(",");

function clearCheckoutDraft() {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {}
}

function readCheckoutDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_KEY));
  } catch {
    return null;
  }
}

// Saves the open checkout, or clears the draft once it's closed or done.
function saveCheckoutDraft() {
  try {
    if (checkout && ["details", "teams", "review"].includes(checkout.step)) {
      const { step, teams, details, utr, items, only, paidId } = checkout;
      const uid = getCurrentUser()?.uid || null;
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ step, teams, details, utr, cartKey: cartKey(items), uid, only, paidId }));
    } else {
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    }
  } catch {}
}

function stepList() {
  const steps = ["details"];
  if (checkout.items.some((i) => i.mode === "team")) steps.push("teams");
  steps.push("review");
  return steps;
}

function stepperHtml() {
  if (checkout.step === "done" || checkout.step === "join") return "";
  const names = { details: "DETAILS", teams: "TEAMS", review: "CONFIRM" };
  const steps = stepList();
  const current = steps.indexOf(checkout.step);
  return `<ol class="checkout-steps">${steps
    .map((s, i) => `<li class="${i === current ? "current" : i < current ? "done" : ""}"${i === current ? ' aria-current="step"' : ""}>${i < current ? "✓" : `${i + 1}.`} ${names[s]}</li>`)
    .join("")}</ol>`;
}

function yearOptionsHtml(selected) {
  return [`<option value="">Select year</option>`, ...YEAR_OPTIONS.map((y) => `<option ${y === selected ? "selected" : ""}>${e(y)}</option>`)].join("");
}

function detailsFieldsHtml(d, user) {
  return `
    <div class="event-reg-group">
      <label class="event-reg-label" for="co-name">Full name *</label>
      <input type="text" class="event-reg-input" id="co-name" maxlength="120" value="${e(d.displayName)}" autocomplete="name" />
    </div>
    <div class="event-reg-group">
      <label class="event-reg-label" for="co-email">Email</label>
      <input type="email" class="event-reg-input" id="co-email" value="${e(user.email)}" readonly />
    </div>
    <div class="event-reg-group">
      <label class="event-reg-label" for="co-college">College / University *</label>
      <input type="text" class="event-reg-input" id="co-college" maxlength="120" value="${e(d.college)}" autocomplete="organization" placeholder="e.g. HPTU Hamirpur" />
    </div>
    <div class="checkout-row">
      <div class="event-reg-group">
        <label class="event-reg-label" for="co-year">Year *</label>
        <select class="event-reg-input" id="co-year">${yearOptionsHtml(d.year)}</select>
      </div>
      <div class="event-reg-group">
        <label class="event-reg-label" for="co-phone">WhatsApp number *</label>
        <input type="tel" class="event-reg-input" id="co-phone" maxlength="20" value="${e(d.phone)}" autocomplete="tel" placeholder="+91 9XXXX XXXXX" />
      </div>
    </div>`;
}

function readDetails(card) {
  checkout.details = {
    displayName: card.querySelector("#co-name").value.trim(),
    college: card.querySelector("#co-college").value.trim(),
    year: card.querySelector("#co-year").value,
    phone: card.querySelector("#co-phone").value.trim(),
  };
  const d = checkout.details;
  if (!d.displayName) throw new Error("Enter your full name.");
  if (!d.college) throw new Error("Enter your college or university.");
  if (!d.year) throw new Error("Select your year.");
  if (d.phone.replace(/\D/g, "").length < 10) throw new Error("Enter a WhatsApp number with 10 digits. Country code is optional.");
}

function readTeams(card) {
  card.querySelectorAll("[data-team-event]").forEach((block) => {
    const eventId = block.dataset.teamEvent;
    const t = checkout.teams[eventId];
    t.teamName = block.querySelector(".co-team-name").value.trim();
    t.members = Array.from(block.querySelectorAll(".co-member")).map((row) => ({
      name: row.querySelector(".co-member-name").value.trim(),
      email: row.querySelector(".co-member-email").value.trim(),
    }));
  });
}

function validateTeams() {
  checkout.items
    .filter((i) => i.mode === "team")
    .forEach(({ event: ev }) => {
      const t = checkout.teams[ev.id];
      const size = t.members.filter((m) => m.name).length + 1;
      if (!t.teamName) throw new Error(`Enter a team name for ${ev.title}.`);
      if (size < ev.minTeam) throw new Error(`${ev.title} needs at least ${ev.minTeam} members, including you.`);
      if (size > ev.maxTeam) throw new Error(`${ev.title} can have at most ${ev.maxTeam} members, including you.`);
    });
}

function renderCheckout(focusSel) {
  const card = document.getElementById("event-reg-card");
  if (!card || !checkout) return;
  const prevStep = card.dataset.step;
  const keepFocus = focusedSelector(card);
  const user = getCurrentUser();
  const step = checkout.step;
  let body = "";

  if (step === "details") {
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">STEP 1 // CONFIRM YOUR DETAILS</span>
        <h3 class="event-reg-title" id="co-title" tabindex="-1">Your details</h3>
        <p class="event-reg-sub">These show on your registrations and Digital ID.</p>
      </div>
      <form class="event-reg-form" id="co-form" novalidate>
        ${detailsFieldsHtml(checkout.details, user)}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          ${checkout.only ? "" : `<button type="button" class="event-submit-btn secondary" data-action="co-back-cart">← BACK TO CART</button>`}
          <button type="submit" class="event-submit-btn">CONTINUE →</button>
        </div>
      </form>`;
  } else if (step === "teams") {
    const blocks = checkout.items
      .filter((i) => i.mode === "team")
      .map(({ event: ev }) => {
        const t = checkout.teams[ev.id];
        const members = t.members
          .map(
            (m, idx) => `
            <div class="co-member">
              <input type="text" class="event-reg-input co-member-name" maxlength="120" placeholder="Member ${idx + 2} name" value="${e(m.name)}" aria-label="Member ${idx + 2} name" />
              <input type="email" class="event-reg-input co-member-email" maxlength="120" placeholder="Email (optional)" value="${e(m.email)}" aria-label="Member ${idx + 2} email" />
              <button type="button" class="cart-remove" data-action="co-remove-member" data-event-id="${e(ev.id)}" data-index="${idx}" aria-label="Remove member ${idx + 2}">✕</button>
            </div>`
          )
          .join("");
        const canAdd = t.members.length + 1 < ev.maxTeam;
        return `
          <fieldset class="co-team" data-team-event="${e(ev.id)}">
            <legend>${e(ev.title)} <span>· ${e(ev.minTeam)}–${e(ev.maxTeam)} members</span></legend>
            <div class="event-reg-group">
              <label class="event-reg-label" for="co-team-name-${e(ev.id)}">Team name *</label>
              <input type="text" class="event-reg-input co-team-name" id="co-team-name-${e(ev.id)}" maxlength="60" value="${e(t.teamName)}" placeholder="e.g. ByteBusters" />
            </div>
            <div class="event-reg-group">
              <span class="event-reg-label">Team leader</span>
              <div class="co-leader">${e(checkout.details.displayName)} (you)</div>
            </div>
            <div class="event-reg-group">
              <span class="event-reg-label">Team members</span>
              ${members || `<p class="event-reg-hint">No other members yet.</p>`}
              ${canAdd ? `<button type="button" class="event-link-btn" data-action="co-add-member" data-event-id="${e(ev.id)}">+ Add member</button>` : ""}
            </div>
          </fieldset>`;
      })
      .join("");
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">STEP 2 // TEAMS</span>
        <h3 class="event-reg-title" id="co-title" tabindex="-1">Team details</h3>
        <p class="event-reg-sub">You'll get a team code to share. Teammates enter it to join from their own accounts.</p>
      </div>
      <form class="event-reg-form" id="co-form" novalidate>
        ${blocks}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          <button type="button" class="event-submit-btn secondary" data-action="co-prev">← BACK</button>
          <button type="submit" class="event-submit-btn">CONTINUE →</button>
        </div>
      </form>`;
  } else if (step === "review") {
    const total = lineTotal(checkout.items);
    const rows = checkout.items
      .map(
        (item) => `
        <li><span>${e(item.event.title)} <em>${item.mode === "team" ? `TEAM · ${e(checkout.teams[item.eventId]?.teamName || "")}` : "SOLO"}</em></span><strong>${item.amount ? `₹${e(lineAmount(item))}` : "FREE"}</strong></li>`
      )
      .join("");
    const payReady = isRazorpayEnabled() || isPaymentConfigured();
    const upiLink = total > 0 ? buildUpiLink(total, `${FEST_CONFIG.name} registration`) : null;
    const paymentHtml =
      total <= 0
        ? `<div class="event-reg-free-note">✓ NO PAYMENT NEEDED</div>`
        : checkout.paidId
          ? `<div class="event-reg-closed-note"><strong>PAYMENT RECEIVED · ID <span class="mono">${e(checkout.paidId)}</span></strong><span>Your registration is not saved yet. Try again below. If it still fails, email ${e(FEST_CONFIG.contactEmail)} with this payment ID.</span></div>`
        : useRazorpay(total)
          ? `<div class="event-upi-payment-box">
              <div class="event-upi-amount">PAY ₹${e(total)} TO COMPLETE REGISTRATION</div>
              <p class="event-upi-help">You'll pay safely with Razorpay (UPI, cards, net banking). Test mode — no real money is taken.</p>
            </div>`
        : payReady
          ? `<div class="event-upi-payment-box">
              <div class="event-upi-amount">PAY ₹${e(total)} TO COMPLETE REGISTRATION</div>
              ${FEST_CONFIG.upiQrImage ? `<div class="event-qr-display"><img src="${e(FEST_CONFIG.upiQrImage)}" alt="UPI QR code" /></div>` : ""}
              ${upiLink ? `<a class="event-upi-app-btn" href="${e(upiLink)}">PAY ₹${e(total)} WITH A UPI APP</a>` : ""}
              <div class="event-upi-id-copy"><span>UPI ID: <strong>${e(FEST_CONFIG.upiId)}</strong></span><button type="button" class="event-upi-copy-btn" data-action="co-copy-upi">COPY</button></div>
              <p class="event-upi-help">After you pay, type the 12-digit UTR number from your receipt. The fest team checks it against the bank record, then confirms your registration.</p>
              <div class="event-reg-group">
                <label class="event-reg-label" for="co-utr">12-digit UTR *</label>
                <input type="text" class="event-reg-input event-reg-utr" id="co-utr" inputmode="numeric" maxlength="12" autocomplete="off" value="${e(checkout.utr || "")}" />
              </div>
            </div>`
          : `<div class="event-reg-closed-note"><strong>TOTAL: ₹${e(total)}</strong><span>Online payment opens soon. Paid events open once the official UPI details are shared.</span></div>`;
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">STEP ${stepList().length} // CONFIRM & PAY</span>
        <h3 class="event-reg-title" id="co-title" tabindex="-1">Confirm registration</h3>
        <p class="event-reg-sub">${e(checkout.details.displayName)} · ${e(checkout.details.college)} · ${e(checkout.details.year)}</p>
      </div>
      <ul class="checkout-summary">${rows}</ul>
      <div class="checkout-total"><span>TOTAL</span><strong>${total ? `₹${e(total)}` : "FREE"}</strong></div>
      <form class="event-reg-form" id="co-form" novalidate>
        ${paymentHtml}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          ${checkout.paidId ? "" : `<button type="button" class="event-submit-btn secondary" data-action="co-prev">← BACK</button>`}
          <button type="submit" class="event-submit-btn" id="co-submit" ${total > 0 && !payReady ? "disabled" : ""}>${e(reviewSubmitLabel(checkout, total))}</button>
        </div>
      </form>`;
  } else if (step === "done") {
    const r = checkout.result;
    const pending = r.total > 0 || r.teamPending;
    const codes = Object.entries(r.teamCodes || {})
      .map(([id, code]) => `<li><span>${e(getEventById(id)?.title || id)}</span><strong class="mono">${e(code)}</strong></li>`)
      .join("");
    const qrs = (r.registrations || [])
      .map((reg) => `<li><strong>${e(reg.event_title)}</strong>${registrationQrHtml(reg, { size: "small" })}</li>`)
      .join("");
    body = `
      <div class="event-reg-head">
        <span class="event-pass-status ${pending ? "pending" : "ok"}">${r.teamPending ? "⏳ TEAM PAYMENT PENDING" : pending ? "⏳ WAITING FOR PAYMENT CHECK" : "✓ REGISTERED"}</span>
        <h3 class="event-reg-title" id="co-title" tabindex="-1">Registration received</h3>
        <p class="event-reg-sub">${r.joinedTeam ? `You joined team ${e(r.joinedTeam)}.` : `Registered for ${r.eventIds.length} event${r.eventIds.length > 1 ? "s" : ""}.`}${r.razorpayId ? ` Payment received (ID ${e(r.razorpayId)}). The fest team will confirm it soon.` : r.total > 0 ? " Your registrations are confirmed once the fest team checks your payment." : r.teamPending ? " Your registration is confirmed once the fest team checks your team leader's payment." : ""}</p>
      </div>
      ${codes ? `<div class="checkout-codes"><span class="event-reg-label">Share these team codes with your teammates</span><ul>${codes}</ul></div>` : ""}
      ${qrs ? `<div class="checkout-qrs"><span class="event-reg-label">Your entry QR code${r.registrations.length > 1 ? "s" : ""} · also saved in your profile</span><ul>${qrs}</ul></div>` : ""}
      <div class="checkout-nav">
        <button type="button" class="event-submit-btn secondary" data-action="co-close">BACK TO EVENTS</button>
        <button type="button" class="event-submit-btn" data-action="co-my-registrations">VIEW MY REGISTRATIONS</button>
      </div>`;
  } else if (step === "join") {
    const ev = getEventById(checkout.joinEventId);
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">JOIN A TEAM</span>
        <h3 class="event-reg-title" id="co-title" tabindex="-1">${e(ev.title)}</h3>
        <p class="event-reg-sub">Enter the code your team leader got after registering.</p>
      </div>
      <form class="event-reg-form" id="co-form" novalidate>
        <div class="event-reg-group">
          <label class="event-reg-label" for="co-code">Team code *</label>
          <input type="text" class="event-reg-input event-reg-code" id="co-code" maxlength="11" autocomplete="off" placeholder="e.g. BYTE-4F8K" />
        </div>
        ${detailsFieldsHtml(checkout.details, user)}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          <button type="button" class="event-submit-btn secondary" data-action="co-close">CANCEL</button>
          <button type="submit" class="event-submit-btn" id="co-submit">JOIN TEAM</button>
        </div>
      </form>`;
  }

  card.innerHTML = `
    <button type="button" class="event-reg-close" data-action="co-close" aria-label="Close"><span class="m-x" aria-hidden="true">✕</span></button>
    ${stepperHtml()}
    <div class="checkout-step" key="${step}">${body}</div>
  `;
  card.dataset.step = step;
  // New step: focus its title. Same step re-rendered (add/remove member):
  // keep focus where it was, or on what the caller asked for.
  if (activeDialog === "checkout") {
    if (prevStep !== step) card.scrollTop = 0;
    focusInto(card, focusSel || (prevStep === step ? keepFocus : null) || DIALOGS.checkout.title);
  }

  const form = card.querySelector("#co-form");
  const utr = card.querySelector("#co-utr");
  if (utr)
    utr.oninput = () => {
      utr.value = checkout.utr = utr.value.replace(/\D/g, "").slice(0, 12);
      saveCheckoutDraft();
    };
  if (form) form.onsubmit = (evt) => onCheckoutSubmit(evt, card);
  saveCheckoutDraft();
}

async function onCheckoutSubmit(evt, card) {
  evt.preventDefault();
  if (submitting || !checkout) return;
  const co = checkout;
  const errBox = card.querySelector("#co-error");
  errBox.hidden = true;
  errBox.textContent = "";
  const steps = stepList();
  try {
    if (checkout.step === "details") {
      readDetails(card);
      checkout.step = steps[steps.indexOf("details") + 1];
      return renderCheckout();
    }
    if (checkout.step === "teams") {
      readTeams(card);
      validateTeams();
      checkout.step = "review";
      return renderCheckout();
    }
    if (checkout.step === "review") {
      const total = lineTotal(checkout.items);
      const viaRazorpay = useRazorpay(total) || Boolean(co.paidId);
      checkout.utr = card.querySelector("#co-utr")?.value.trim() || "";
      if (total > 0 && !viaRazorpay && !UTR_PATTERN.test(checkout.utr)) throw new Error("Enter the 12-digit UTR from your UPI payment receipt.");
      const btn = card.querySelector("#co-submit");
      const cartLines = co.items.map((i) => ({ eventId: i.eventId, mode: i.mode }));
      if (viaRazorpay && !co.paidId) {
        // Pay first, then save: check everything up front so nobody pays and then fails validation.
        validateCheckout(cartLines, co.details, co.teams);
        btn.disabled = true;
        btn.textContent = "OPENING PAYMENT…";
        submitting = co;
        const paid = await payWithRazorpay({
          amountRupees: total,
          description: co.items.map((i) => i.event.title).join(", "),
          prefill: { name: co.details.displayName, email: getCurrentUser()?.email || "", phone: co.details.phone },
          events: co.items.map((i) => i.eventId),
        });
        if (paid.status !== "paid") {
          btn.disabled = false;
          btn.textContent = reviewSubmitLabel(co, total);
          return;
        }
        co.paidId = paid.paymentId;
        saveCheckoutDraft();
      }
      btn.disabled = true;
      btn.textContent = "REGISTERING…";
      submitting = co;
      let result;
      try {
        result = await checkoutCart(
          cartLines,
          co.details,
          co.teams,
          viaRazorpay ? co.paidId : co.utr,
          viaRazorpay ? { method: "razorpay" } : undefined
        );
      } catch (err) {
        if (!co.paidId) throw err;
        // Paid but not saved: show the payment ID prominently, then the reason.
        if (checkout === co) {
          renderCheckout();
          const box = document.getElementById("co-error");
          if (box) {
            box.textContent = `${err.message || "We couldn't save your registration."} Keep your payment ID ${co.paidId}.`;
            box.hidden = false;
          }
        }
        return;
      }
      clearCart(result.eventIds);
      if (checkout !== co) return refreshEventsGrid();
      if (co.paidId) result.razorpayId = co.paidId;
      checkout.result = result;
      checkout.step = "done";
      refreshEventsGrid();
      return renderCheckout();
    }
    if (checkout.step === "join") {
      readDetails(card);
      const code = card.querySelector("#co-code").value.trim();
      if (!code) throw new Error("Enter your team code.");
      const btn = card.querySelector("#co-submit");
      btn.disabled = true;
      btn.textContent = "JOINING...";
      submitting = co;
      const joined = await joinTeamWithCode(code, getEventById(co.joinEventId), co.details);
      removeFromCart(co.joinEventId);
      if (checkout !== co) return refreshEventsGrid();
      const teamPaid = ["free", "paid", "verified"].includes(joined.team?.paymentStatus || "free");
      checkout.result = {
        total: 0,
        eventIds: [checkout.joinEventId],
        teamCodes: {},
        joinedTeam: joined.team?.teamName,
        teamPending: !teamPaid,
        registrations: joined.registration ? [joined.registration] : [],
      };
      checkout.step = "done";
      refreshEventsGrid();
      return renderCheckout();
    }
  } catch (err) {
    if (checkout !== co) return;
    // role="alert": show it a beat after hiding so a repeated message is
    // announced again.
    const message = err.message || "Something went wrong. Check your internet and try again.";
    setTimeout(() => {
      errBox.textContent = message;
      errBox.hidden = false;
    }, 50);
    const btn = card.querySelector("#co-submit");
    if (btn) {
      btn.disabled = false;
      btn.textContent = co.step === "join" ? "JOIN TEAM" : reviewSubmitLabel(co, lineTotal(co.items));
    }
  } finally {
    if (submitting === co) submitting = null;
  }
}

function onCheckoutClick(evt) {
  const card = document.getElementById("event-reg-card");
  const btn = evt.target.closest("[data-action]");
  if (!btn || !checkout || !card?.contains(btn)) return;
  const action = btn.dataset.action;
  if (submitting && action !== "co-copy-upi") return;
  const steps = stepList();

  if (action === "co-close") return requestCloseCheckout();
  if (action === "co-copy-upi") {
    navigator.clipboard?.writeText(FEST_CONFIG.upiId).then(
      () => flashToast("UPI ID copied"),
      () => flashToast(`Couldn't copy. The UPI ID is ${FEST_CONFIG.upiId}`)
    );
    return;
  }
  if (action === "co-back-cart") {
    closeCheckout();
    return openCart();
  }
  if (action === "co-prev") {
    if (checkout.step === "teams") readTeams(card);
    if (checkout.step === "review") checkout.utr = card.querySelector("#co-utr")?.value || "";
    checkout.step = steps[Math.max(steps.indexOf(checkout.step) - 1, 0)];
    return renderCheckout();
  }
  if (action === "co-add-member" || action === "co-remove-member") {
    readTeams(card);
    const t = checkout.teams[btn.dataset.eventId];
    if (action === "co-add-member") t.members.push({ name: "", email: "" });
    else t.members.splice(Number(btn.dataset.index), 1);
    // Adding: focus the new member's name field.
    return renderCheckout(
      action === "co-add-member"
        ? `[data-team-event="${CSS.escape(btn.dataset.eventId)}"] .co-member:last-of-type .co-member-name`
        : `[data-team-event="${CSS.escape(btn.dataset.eventId)}"] .co-team-name`
    );
  }
  if (action === "co-my-registrations") {
    closeCheckout();
    if (typeof window.openProfilePanel === "function") window.openProfilePanel("registrations");
  }
}

/**
 * Fast cascade reveal for newly rendered event cards
 */
export function triggerCardsReveal(stagger = true) {
  if (typeof document === "undefined") return;
  const cards = Array.from(document.querySelectorAll(".event-card"));
  if (!cards.length) return;

  // Re-renders (filter, search, sign-in) show cards at once: adding the
  // class before the first paint skips the fade, so updates never cascade.
  if (!stagger) {
    cards.forEach((card) => card.classList.add("is-revealed"));
    return;
  }
  // First paint: 30ms per item, capped at 200ms total.
  cards.forEach((card, index) => {
    const delay = Math.min((index % 4) * 30, 200);
    setTimeout(() => {
      card.classList.add("is-revealed");
    }, delay);
  });
}

let scrollMotionCleanup = null;

/**
 * Initialize Scroll Motion UI, Top Progress Bar, Sticky Toolbar Morph, and Parallax
 */
export function initScrollMotion() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (scrollMotionCleanup) {
    try {
      scrollMotionCleanup();
    } catch {}
    scrollMotionCleanup = null;
  }

  const progressBar = document.getElementById("events-scroll-progress");
  const scrollHud = document.getElementById("events-scroll-hud");
  const scrollTopBtn = document.getElementById("events-scroll-top-btn");
  const scrollCounter = document.getElementById("events-scroll-counter");
  const toolbar = document.querySelector(".events-toolbar");
  const heroCoords = document.querySelector(".events-hero-coords");
  const heroTitle = document.querySelector(".events-hero-title");
  const grid = document.getElementById("events-card-grid");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Smooth Scroll-to-Top Button
  if (scrollTopBtn) {
    scrollTopBtn.onclick = (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    };
  }

  // 1. Throttled RAF Scroll Handler
  // Only touch the DOM when a value actually changes: rewriting the same
  // class / text every frame still costs a style recalc (and the HUD's
  // "active" class feeds an html:has() rule, which re-matches the page).
  let ticking = false;
  let pinned = null;
  let hudOn = null;
  let counterText = "";
  let heroDone = false;
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? Math.min(Math.max((scrollTop / scrollHeight) * 100, 0), 100) : 0;

        // Top edge progress accent
        if (progressBar) {
          progressBar.style.transform = `scaleX(${(progress / 100).toFixed(4)})`;
        }

        // Pinned sticky toolbar morphing state
        if (toolbar && pinned !== scrollTop > 160) {
          pinned = scrollTop > 160;
          toolbar.classList.toggle("is-pinned", pinned);
        }

        // Floating Brutalist HUD
        if (scrollHud) {
          const on = scrollTop > 220;
          if (hudOn !== on) {
            hudOn = on;
            scrollHud.classList.toggle("active", on);
          }
          const text = `${Math.round(progress)}% EXPLORED`;
          if (on && scrollCounter && text !== counterText) {
            counterText = text;
            scrollCounter.textContent = text;
          }
        }

        // Hero Ambient Parallax (fade & subtle vertical shift). Past 600px
        // write the end state once, then leave the hero alone.
        if (!reduceMotion && (scrollTop < 600 || !heroDone)) {
          heroDone = scrollTop >= 600;
          const st = Math.min(scrollTop, 600);
          if (heroCoords) heroCoords.style.transform = `translate3d(0, ${st * 0.15}px, 0)`;
          if (heroTitle) {
            heroTitle.style.transform = `scale(${Math.max(1 - st / 1200, 0.9)})`;
            heroTitle.style.opacity = `${Math.max(1 - st / 500, 0.4)}`;
          }
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 2. Card In-View Scroll Reveal
  // IntersectionObserver + the CSS .is-revealed transition (no per-card
  // ScrollTrigger: those re-measure every card on refresh/resize).
  let observer = null;
  const setupCardAnimations = () => {
    const cards = Array.from(document.querySelectorAll(".event-card"));
    if (!cards.length) return;

    if (reduceMotion) {
      cards.forEach((c) => c.classList.add("is-revealed"));
      return;
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const card = entry.target;
              observer.unobserve(card);
              const idx = cards.indexOf(card);
              const delay = (idx % 3) * 30;
              setTimeout(() => {
                card.classList.add("is-revealed");
              }, delay);
            }
          });
        },
        { rootMargin: "0px 0px -40px 0px", threshold: 0.1 }
      );

      cards.forEach((card) => {
        if (!card.classList.contains("is-revealed")) {
          observer.observe(card);
        }
      });
    } else {
      cards.forEach((c) => c.classList.add("is-revealed"));
    }
  };

  setupCardAnimations();

  // 3. Subtle 3D Card Perspective Tilt on Hover
  // At most one measure + write per frame (mousemove fires faster than that).
  let tiltEvt = null;
  let tiltRaf = 0;
  const tilt = () => {
    tiltRaf = 0;
    const e = tiltEvt;
    const card = e && e.target.closest(".event-card.is-revealed");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = -(y / (rect.height / 2)) * 3.5;
    const rotY = (x / (rect.width / 2)) * 3.5;
    card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-5px) scale(1.01)`;
  };
  const onMouseMove = (e) => {
    tiltEvt = e;
    if (!tiltRaf) tiltRaf = requestAnimationFrame(tilt);
  };

  const onMouseLeave = (e) => {
    const card = e.target.closest(".event-card.is-revealed");
    if (card) {
      // A pending frame would re-tilt the card the pointer just left.
      if (tiltEvt && card.contains(tiltEvt.target) && !card.contains(e.relatedTarget)) tiltEvt = null;
      card.style.transform = "";
    }
  };

  // Tilt only for mouse users: on touch it never resets and just costs repaints.
  const enableTilt = grid && finePointer && !reduceMotion;
  if (enableTilt) {
    grid.addEventListener("mousemove", onMouseMove, { passive: true });
    grid.addEventListener("mouseout", onMouseLeave, { passive: true });
  }

  scrollMotionCleanup = () => {
    window.removeEventListener("scroll", onScroll);
    observer?.disconnect();
    cancelAnimationFrame(tiltRaf);
    if (enableTilt) {
      grid.removeEventListener("mousemove", onMouseMove);
      grid.removeEventListener("mouseout", onMouseLeave);
    }
  };
}

/**
 * Refresh Cards Grid in-place without rebuilding entire page
 */
export function refreshEventsGrid() {
  const grid = document.getElementById("events-card-grid");
  if (!grid) return;
  // Keep keyboard focus on the same card when its buttons are re-rendered
  // (e.g. a card turns REGISTERED after sign-in).
  const focused = grid.contains(document.activeElement) ? document.activeElement : null;
  const focusEventId = focused?.dataset?.eventId;
  const focusAction = focused?.dataset?.action;
  grid.innerHTML = renderGridHtml(filterEvents(activeCategory, activeSearchQuery));
  const stay = document.getElementById("events-stay");
  if (stay) stay.innerHTML = stayBannerHtml();
  if (focusEventId) {
    const card = grid.querySelector(`.event-card[data-event-id="${CSS.escape(focusEventId)}"]`);
    const target =
      card &&
      ((focusAction && card.querySelector(`[data-action="${CSS.escape(focusAction)}"]`)) ||
        card.querySelector(".event-btn-details"));
    try {
      target?.focus({ preventScroll: true });
    } catch {}
  }
  triggerCardsReveal(false);
}

/**
 * Global (document-level) listeners are bound once, no matter how many times
 * the /events page is mounted.
 */
function bindGlobalListeners() {
  if (globalListenersBound) return;
  globalListenersBound = true;

  document.addEventListener("click", (evt) => {
    const btn = evt.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.eventId;
    switch (btn.dataset.action) {
      case "view-details":
        return id && openDossierFromCard(id);
      case "register-now":
        return id && handleRegisterNow(id);
      case "dossier-back":
        return closeEventDossier();
      case "org-link": {
        // Plain <a> would reload the app; route it. Keep /events/<id> in
        // history so coming back reopens the details.
        const router = getRouter();
        if (!router || evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.button !== 0) return;
        evt.preventDefault();
        skipCloseNav = true;
        closeEventDossier();
        skipCloseNav = false;
        return router.push(btn.getAttribute("href"));
      }
      case "route-link": {
        const router = getRouter();
        if (!router || evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.button !== 0) return;
        evt.preventDefault();
        return router.push(btn.getAttribute("href"));
      }
      case "book-accommodation":
        return openAccommodationBooking();
      case "view-booking":
        closeEventDossier();
        if (typeof window.openProfilePanel === "function") window.openProfilePanel("registrations");
        return;
      case "join-team":
        return id && openJoinTeam(id);
      case "toggle-cart":
        return id && handleToggleCart(id);
      case "cart-close":
        return closeCart();
      case "cart-remove":
        return id && removeFromCart(id);
      case "cart-mode":
        return id && setCartItemMode(id, btn.dataset.mode);
      case "cart-done":
        return startCheckout();
      default:
        return onCheckoutClick(evt);
    }
  });

  document.addEventListener("keydown", (evt) => {
    if (evt.defaultPrevented) return;
    if (evt.key === "Tab") {
      if (activeDialog && !isOtherOverlayOpen()) trapTab(evt);
      return;
    }
    if (evt.key !== "Escape") return;
    // The profile overlay / auth modal handle their own Escape.
    if (isOtherOverlayOpen()) return;
    if (isCheckoutOpen) {
      // Handled here: Esc's default action must not reach the confirm this opens.
      evt.preventDefault();
      requestCloseCheckout();
    }
    else if (isCartOpen) closeCart();
    else if (isDossierOpen) closeEventDossier();
  });

  subscribeAuthState((user) => {
    // Signing out drops the open checkout's details (name, college, phone).
    if (lastAuthUid && !user) clearCheckoutDraft();
    lastAuthUid = user?.uid || null;
    setCartOwner(user?.uid);
    pruneRegisteredFromCart();
    if (document.getElementById("events-card-grid")) refreshEventsGrid();
    if (user && resumeCheckoutUntil > Date.now()) {
      resumeCheckoutUntil = 0;
      const only = resumeOnlyId;
      resumeOnlyId = null;
      setTimeout(() => {
        if (document.getElementById("event-reg-modal")) startCheckout(only);
      }, 300);
    }
  });

  subscribeCart((items) => syncCartUi(items));
}

// Drop cart items the user has since registered for (e.g. on another device).
function pruneRegisteredFromCart() {
  const done = getCartItems().filter((i) => isEventRegistered(i.eventId)).map((i) => i.eventId);
  if (done.length) clearCart(done);
}

const BODY_LEVEL_IDS = [
  "event-dossier-overlay",
  "event-reg-modal",
  "events-cart-overlay",
  "events-cart-fab",
  "events-scroll-hud",
  "events-scroll-progress",
];

/**
 * Mount the events page: move overlays to <body> (replacing any left over
 * from a previous visit) and wire up toolbar, search and overlays.
 */
export function initEventsPage() {
  const root = document.getElementById("chaitanya-events-page");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  BODY_LEVEL_IDS.forEach((id) => {
    const fresh = root.querySelector(`#${id}`);
    if (!fresh) return;
    document.querySelectorAll(`body > #${id}`).forEach((stale) => stale !== fresh && stale.remove());
    document.body.appendChild(fresh);
  });

  bindGlobalListeners();
  isDossierOpen = isCartOpen = isCheckoutOpen = false;
  activeDialog = null;
  setBackgroundInert(null);
  ensureToast();

  const catBar = document.getElementById("events-cat-bar");
  catBar?.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".events-cat-btn");
    if (!btn?.dataset.cat) return;
    // Clicking the active category again deselects it (back to all events).
    activeCategory = btn.dataset.cat === activeCategory ? "all" : btn.dataset.cat;
    catBar.querySelectorAll(".events-cat-btn").forEach((b) => {
      const on = b.dataset.cat === activeCategory;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    saveFilters();
    refreshEventsGrid();
  });

  const searchBox = document.getElementById("events-search-box");
  const clearBtn = document.getElementById("events-search-clear-btn");
  searchBox?.addEventListener("input", (evt) => {
    activeSearchQuery = evt.target.value || "";
    clearBtn?.classList.toggle("active", Boolean(activeSearchQuery));
    saveFilters();
    refreshEventsGrid();
  });
  clearBtn?.addEventListener("click", () => {
    if (searchBox) searchBox.value = "";
    activeSearchQuery = "";
    clearBtn.classList.remove("active");
    saveFilters();
    refreshEventsGrid();
    searchBox?.focus(); // the clear button hides itself, so don't drop focus
  });

  document.getElementById("events-cart-fab")?.addEventListener("click", openCart);

  const outside = [
    ["event-dossier-overlay", closeEventDossier],
    ["events-cart-overlay", closeCart],
    ["event-reg-modal", requestCloseCheckout],
  ];
  outside.forEach(([id, close]) => bindBackdrop(document.getElementById(id), close));

  setCartOwner(getCurrentUser()?.uid);
  pruneRegisteredFromCart();
  syncCartUi();
  refreshEventsGrid();
  initScrollMotion();
  watchForUnmount(root);

  // Deep link from the profile overlay: /events?cart=1 opens the cart.
  const url = new URL(window.location.href);
  if (url.searchParams.get("cart") === "1") {
    url.searchParams.delete("cart");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    setTimeout(openCart, 400);
  }

  // /events/<id>: open that event's details (all widths); unknown id → /events.
  hookRouter();
  const deep = location.pathname.match(DEEP_LINK);
  if (deep) {
    const id = decodeURIComponent(deep[1]);
    if (dossierEvent(id)) openEventDossier(id);
    else if (getRouter()) getRouter().replace("/events");
    else history.replaceState(history.state, "", "/events");
  }

  // Reloaded mid-checkout (e.g. the phone dropped the tab during the UPI
  // payment): reopen it where the student left off once they're signed in.
  const draft = readCheckoutDraft();
  if (draft) {
    if (getCurrentUser()) setTimeout(() => startCheckout(draft.only || null), 400);
    else {
      resumeCheckoutUntil = Date.now() + 3 * 60 * 1000;
      resumeOnlyId = draft.only || null;
    }
  }
}

function bindBackdrop(el, close) {
  el?.addEventListener("click", (evt) => evt.target === el && close());
  // Wheel on the dimmed backdrop would scroll the page behind the dialog.
  el?.addEventListener("wheel", (evt) => evt.target === el && evt.preventDefault(), { passive: false });
}

// ----------------------------------------------------------------------------
// ACCOMMODATION (bookable from any route, e.g. /accommodation)
// ----------------------------------------------------------------------------

const ACCOMMODATION_TOASTS = {
  booked: "You've already booked a stay. Your pass is in My registrations.",
  closed: "Accommodation booking is closed.",
  soon: "Accommodation booking opens soon.",
  "needs-event": "Accommodation is only for people registered for an event. Register for an event first. You can add both to the cart.",
};

// Off /events the checkout and cart dialogs don't exist yet: add the same
// markup to <body> (initEventsPage replaces it with the page's own copies).
function ensureBookingContainers() {
  bindGlobalListeners();
  ensureToast();
  const add = (id, html, close) => {
    if (document.getElementById(id)) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const el = wrap.firstElementChild;
    document.body.appendChild(el);
    bindBackdrop(el, close);
  };
  add(
    "event-reg-modal",
    `<div class="event-reg-modal" id="event-reg-modal"><div class="event-reg-card" id="event-reg-card" role="dialog" aria-modal="true" aria-labelledby="co-title"></div></div>`,
    requestCloseCheckout
  );
  add(
    "events-cart-overlay",
    `<div class="events-cart-overlay" id="events-cart-overlay"><aside class="events-cart-panel" id="events-cart-panel" role="dialog" aria-modal="true" aria-labelledby="events-cart-title"></aside></div>`,
    closeCart
  );
}

/**
 * Book accommodation from any page: sign in if needed, then the same checkout
 * as REGISTER. Registered for an event already → checks out just the stay
 * (cart untouched); otherwise an event in the cart is required and the stay
 * is added to the cart and the cart is checked out together.
 */
export function openAccommodationBooking() {
  ensureBookingContainers();
  const { state } = accommodationState();
  if (state === "soon" || state === "closed") return flashToast(ACCOMMODATION_TOASTS[state]);
  if (!getCurrentUser()) {
    closeEventDossier();
    closeCart();
    openAuthModal("login", { afterSignIn: () => openAccommodationBooking() });
    return;
  }
  if (state === "booked") {
    flashToast(ACCOMMODATION_TOASTS.booked);
    return window.openProfilePanel?.("registrations");
  }
  if (state === "needs-event") return flashToast(ACCOMMODATION_TOASTS[state]);
  closeEventDossier();
  if (isRegisteredForAnyEvent()) return startCheckout(ACCOMMODATION.id);
  try {
    addToCart(ACCOMMODATION.id);
  } catch (err) {
    return flashToast(err.message);
  }
  startCheckout();
}

/**
 * The events view has no Vue unmount hook, so watch for its root leaving the
 * DOM and remove everything it moved to <body> (cart button, HUD, overlays),
 * plus the body class that hides the site's page transition.
 */
function watchForUnmount(root) {
  const observer = new MutationObserver(() => {
    if (root.isConnected) return;
    observer.disconnect();
    destroyEventsPage();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function destroyEventsPage() {
  BODY_LEVEL_IDS.forEach((id) => document.querySelectorAll(`body > #${id}`).forEach((el) => el.remove()));
  document.getElementById("events-toast")?.remove();
  document.body.classList.remove("has-events-page");
  const trans = document.querySelector(".transition-component");
  if (trans) ["display", "opacity", "clipPath", "webkitClipPath"].forEach((k) => (trans.style[k] = ""));
  if (scrollMotionCleanup) {
    try {
      scrollMotionCleanup();
    } catch {}
    scrollMotionCleanup = null;
  }
  isDossierOpen = isCartOpen = isCheckoutOpen = false;
  leaveDialog?.remove();
  leaveDialog = null;
  dossierEventId = null;
  checkout = null;
  submitting = null;
  // Leaving /events in the app closes the checkout for good: the draft is
  // only for a reload or a dropped tab (no unmount runs then).
  clearCheckoutDraft();
  // Leaving /events with a drawer open must not leave the site inert.
  activeDialog = null;
  setBackgroundInert(null);
}

// Compatibility: older code paths call openEventRegistration(eventId).
export function openEventRegistration(eventId) {
  const ev = getEventById(eventId);
  if (!ev) return;
  if (isEventRegistered(ev.id)) return window.openProfilePanel?.("registrations");
  if (isRegistrationOpen(ev)) handleRegisterNow(ev.id);
}

if (typeof window !== "undefined") {
  window.openEventDossier = openEventDossier;
  window.openEventRegistration = openEventRegistration;
  window.openEventsCart = openCart;
  window.openAccommodationBooking = openAccommodationBooking;
  window.initEventsPage = initEventsPage;
  window.initScrollMotion = initScrollMotion;
  window.triggerCardsReveal = triggerCardsReveal;
  window.renderEventsPageHtml = renderEventsPageHtml;
}
