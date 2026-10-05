/**
 * ============================================================================
 * Chaitanya 2k26 — Events Page Component & Interactive Controller
 * ============================================================================
 * - /events layout with hero, sticky category toolbar and live search
 * - Event details drawer (fee, deadline, registration type, team size, heads)
 * - Cart: add several events, pick solo/team, see the total, remove items
 * - Checkout: confirm details → team names/members → review & pay → done
 * - Join an existing team with a code
 */

import {
  getEventById,
  getCategories,
  filterEvents,
  isRegistrationOpen,
  isPastDeadline,
  formatDeadline,
  feeLabel,
} from "./events-data.js";

import {
  getCurrentUser,
  subscribeAuthState,
  checkoutCart,
  joinTeamWithCode,
  isEventRegistered,
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

import {
  FEST_CONFIG,
  getFestDatesLabel,
  isPaymentConfigured,
  buildUpiLink,
  escapeHtml as e,
} from "./fest-config.js";

const UTR_PATTERN = /^\d{12}$/;

let activeCategory = "all";
let activeSearchQuery = "";
let isDossierOpen = false;
let isCartOpen = false;
let isCheckoutOpen = false;
let resumeCheckoutUntil = 0; // resume checkout only if sign-in completes soon after "Done"
let globalListenersBound = false;

// Checkout wizard state
let checkout = null;

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
      <button class="events-cat-btn ${activeCategory === cat.id ? "active" : ""}" data-cat="${e(cat.id)}">
        ${e(cat.name)}
        <span class="cat-count">(${cat.count})</span>
      </button>
    `
    )
    .join("");

  return `
    <div class="events-page-root" id="chaitanya-events-page">
      <div id="events-scroll-progress"></div>

      <div class="events-container">
        <div class="events-hero">
          <span class="events-hero-coords">[ 31.7088° N, 76.5273° E // HPTU HAMIRPUR ]</span>
          <span class="events-hero-tag">CHAITANYA 2K26 // SCHEDULE & COMPETITIONS</span>
          <h1 class="events-hero-title">EVENTS & COMPETITIONS</h1>
          <p class="events-hero-subtitle">
            EXPLORE ${e(totalEvents())} EVENTS ACROSS CODING, DESIGN, BUSINESS, ESPORTS & CULTURE.
            ADD THE ONES YOU LIKE TO YOUR CART AND REGISTER FOR ALL OF THEM IN ONE GO.
          </p>
          <div class="events-stats-strip">
            <span class="events-stat-pill highlight">[ ${e(totalEvents())} EVENTS ]</span>
            <span class="events-stat-pill">[ ${e(FEST_CONFIG.festDays || 2)} DAYS // ${e(getFestDatesLabel())} ]</span>
            <span class="events-stat-pill">[ HPTU HAMIRPUR ]</span>
          </div>
          <p class="events-hero-note">Entry fees, prizes and registration details will be notified soon. Timings and venues may change.</p>
        </div>

        <div class="events-toolbar">
          <div class="events-categories" id="events-cat-bar">${categoriesHtml}</div>
          <div class="events-search-wrap">
            <input type="text" class="events-search-input" id="events-search-box"
              placeholder="SEARCH EVENTS, VENUES, STUDENT HEADS..." value="${e(activeSearchQuery)}" aria-label="Search events" />
            <button class="events-search-clear ${activeSearchQuery ? "active" : ""}" id="events-search-clear-btn" aria-label="Clear search">✕</button>
          </div>
        </div>

        <div class="events-grid" id="events-card-grid">${renderGridHtml(events)}</div>
      </div>

      <div class="events-scroll-hud" id="events-scroll-hud">
        <div class="events-scroll-metric">
          <span class="pulse-dot"></span>
          <span id="events-scroll-counter">${e(totalEvents())} EVENTS</span>
        </div>
        <button class="events-scroll-top-btn" id="events-scroll-top-btn" title="Return to Top">[ ↑ TOP ]</button>
      </div>

      <button type="button" class="events-cart-fab" id="events-cart-fab" aria-haspopup="dialog">
        <span class="events-cart-fab-label">[ CART ]</span>
        <span class="events-cart-fab-count" id="events-cart-count">0</span>
      </button>

      <div class="event-dossier-overlay" id="event-dossier-overlay">
        <div class="event-dossier-panel" id="event-dossier-panel" role="dialog" aria-modal="true"></div>
      </div>

      <div class="events-cart-overlay" id="events-cart-overlay">
        <aside class="events-cart-panel" id="events-cart-panel" role="dialog" aria-modal="true" aria-label="Your cart"></aside>
      </div>

      <div class="event-reg-modal" id="event-reg-modal">
        <div class="event-reg-card" id="event-reg-card" role="dialog" aria-modal="true"></div>
      </div>
    </div>
  `;
}

function renderGridHtml(events) {
  return events.length
    ? events.map((ev) => renderEventCardHtml(ev)).join("")
    : `
      <div class="events-empty">
        <h3>No Events Found</h3>
        <p>No events match your search or category filter. Try clearing your search.</p>
      </div>
    `;
}

/**
 * The main action button for an event, by state.
 */
function actionButtonHtml(ev, { large = false } = {}) {
  const cls = large ? "event-submit-btn event-action-large" : "event-btn-register";
  if (isEventRegistered(ev.id)) {
    return `<button type="button" class="${cls} registered" data-action="view-booking" data-event-id="${e(ev.id)}">[ ✓ REGISTERED ]</button>`;
  }
  if (isInCart(ev.id)) {
    return `<button type="button" class="${cls} in-cart" data-action="open-cart" data-event-id="${e(ev.id)}">[ ✓ IN CART ]</button>`;
  }
  if (isRegistrationOpen(ev)) {
    return `<button type="button" class="${cls}" data-action="add-to-cart" data-event-id="${e(ev.id)}">[ + ADD TO CART ]</button>`;
  }
  const label = isPastDeadline(ev) ? "REGISTRATION CLOSED" : "REGISTRATION SOON";
  return `<button type="button" class="${cls} is-closed" disabled aria-disabled="true">[ ${label} ]</button>`;
}

function renderEventCardHtml(ev) {
  const catObj = getCategories().find((c) => c.id === ev.category);
  const accentColor = catObj ? catObj.accent || "#000000" : "#000000";

  return `
    <div class="event-card" data-event-id="${e(ev.id)}">
      <span class="corner corner-tl">+</span>
      <span class="corner corner-tr">+</span>
      <span class="corner corner-bl">+</span>
      <span class="corner corner-br">+</span>

      <div class="event-card-header">
        <span class="event-badge-category" style="color:${accentColor}; border-color:${accentColor};">${e(ev.categoryName)}</span>
        <span class="event-badge-format">${e(ev.format)}</span>
      </div>

      <h2 class="event-card-title">${e(ev.title)}</h2>
      <p class="event-card-tagline">${e(ev.tagline)}</p>

      <div class="event-card-meta">
        <div class="event-meta-row"><span class="event-meta-label">WHEN:</span><span class="event-meta-val">${e(ev.date)} | ${e(ev.time)}</span></div>
        <div class="event-meta-row"><span class="event-meta-label">VENUE:</span><span class="event-meta-val">${e(ev.venue)}</span></div>
        <div class="event-meta-row"><span class="event-meta-label">FEE:</span><span class="event-meta-val">${e(feeLabel(ev))}</span></div>
        <div class="event-meta-row"><span class="event-meta-label">REGISTER BY:</span><span class="event-meta-val">${e(formatDeadline(ev))}</span></div>
      </div>

      <div class="event-card-actions">
        <button class="event-btn-details" data-action="view-details" data-event-id="${e(ev.id)}">[ VIEW DETAILS ]</button>
        ${actionButtonHtml(ev)}
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// DETAILS DRAWER
// ----------------------------------------------------------------------------

export function openEventDossier(eventId) {
  const ev = getEventById(eventId);
  if (!ev) return;
  const overlay = document.getElementById("event-dossier-overlay");
  const panel = document.getElementById("event-dossier-panel");
  if (!overlay || !panel) return;

  const catObj = getCategories().find((c) => c.id === ev.category);
  const accentColor = catObj ? catObj.accent || "#000000" : "#000000";
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
  let sectionCount = 2;
  const sectionNo = () => String(++sectionCount).padStart(2, "0");

  panel.innerHTML = `
    <button class="event-dossier-close" id="dossier-close-btn">[ ESC / CLOSE ]</button>
    <div>
      <span class="event-dossier-badge" style="color:${accentColor}; border-color:${accentColor};">${e(ev.categoryName)} // ${e(ev.badge)}</span>
      <h2 class="event-dossier-title">${e(ev.title)}</h2>
      <p class="event-dossier-tagline">${e(ev.tagline)}</p>
    </div>

    <div class="event-dossier-specs">
      <div class="event-spec-item"><span class="event-spec-k">DATE & TIME</span><span class="event-spec-v">${e(ev.date)} · ${e(ev.time)}</span></div>
      <div class="event-spec-item"><span class="event-spec-k">VENUE</span><span class="event-spec-v">${e(ev.venue)}</span></div>
      <div class="event-spec-item"><span class="event-spec-k">FEE</span><span class="event-spec-v">${e(feeLabel(ev))}</span></div>
      <div class="event-spec-item"><span class="event-spec-k">REGISTER BY</span><span class="event-spec-v">${e(formatDeadline(ev))}</span></div>
      <div class="event-spec-item"><span class="event-spec-k">REGISTRATION</span><span class="event-spec-v">${e(typeLabel)}</span></div>
      <div class="event-spec-item"><span class="event-spec-k">TEAM SIZE</span><span class="event-spec-v">${ev.registrationType === "solo" ? "1 (solo)" : `${e(ev.minTeam)}–${e(ev.maxTeam)} members`}</span></div>
      <div class="event-spec-item"><span class="event-spec-k">PRIZES</span><span class="event-spec-v">${e(ev.prizePool)}</span></div>
    </div>

    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ 01. ABOUT ]</h4>
      <p class="event-dossier-text">${e(ev.overview)}</p>
    </div>

    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ 02. RULES ]</h4>
      <ul class="event-dossier-list">${rulesHtml}</ul>
    </div>

    ${roundsHtml ? `
    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ ${sectionNo()}. FORMAT & ROUNDS ]</h4>
      <div class="event-rounds">${roundsHtml}</div>
    </div>` : ""}

    ${scoringHtml ? `
    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ ${sectionNo()}. ${ev.id === "esports-bgmi" ? "SCORING" : "JUDGING CRITERIA"} ]</h4>
      <div class="event-scoring">${scoringHtml}</div>
    </div>` : ""}

    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ ${sectionNo()}. STUDENT HEADS & CONTACT ]</h4>
      <div>${coordinatorsHtml}</div>
    </div>

    <div class="event-dossier-cta">
      ${actionButtonHtml(ev, { large: true })}
      ${canJoin ? `<button type="button" class="event-link-btn" data-action="join-team" data-event-id="${e(ev.id)}">Already in a team? Join with a team code →</button>` : ""}
    </div>
  `;

  overlay.classList.add("active");
  isDossierOpen = true;
  panel.querySelector("#dossier-close-btn").onclick = closeEventDossier;
}

export function closeEventDossier() {
  document.getElementById("event-dossier-overlay")?.classList.remove("active");
  isDossierOpen = false;
}

// ----------------------------------------------------------------------------
// CART
// ----------------------------------------------------------------------------

function renderCartPanel() {
  const panel = document.getElementById("events-cart-panel");
  if (!panel) return;
  const items = getCartItems();
  const total = getCartTotal(items);

  const rows = items
    .map(({ event: ev, mode, amount }) => {
      const typeControl =
        ev.registrationType === "both"
          ? `<div class="cart-mode" role="group" aria-label="Entry type for ${e(ev.title)}">
               <button type="button" class="${mode === "solo" ? "active" : ""}" data-action="cart-mode" data-mode="solo" data-event-id="${e(ev.id)}">SOLO</button>
               <button type="button" class="${mode === "team" ? "active" : ""}" data-action="cart-mode" data-mode="team" data-event-id="${e(ev.id)}">TEAM</button>
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
            <span class="cart-amount">${amount ? `₹${e(amount)}` : "FREE"}</span>
            <button type="button" class="cart-remove" data-action="cart-remove" data-event-id="${e(ev.id)}" aria-label="Remove ${e(ev.title)}">REMOVE</button>
          </div>
        </li>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="cart-head">
      <h3>YOUR CART</h3>
      <button type="button" class="cart-close" data-action="cart-close" aria-label="Close cart">[ CLOSE ]</button>
    </div>
    ${items.length
      ? `<ul class="cart-list">${rows}</ul>
         <div class="cart-foot">
           <div class="cart-total"><span>${items.length} EVENT${items.length > 1 ? "S" : ""}</span><strong>TOTAL ${total ? `₹${e(total)}` : "FREE"}</strong></div>
           <button type="button" class="event-submit-btn cart-done" data-action="cart-done">[ DONE → REGISTER ]</button>
         </div>`
      : `<div class="cart-empty"><p>Your cart is empty.</p><p>Open an event and tap <strong>ADD TO CART</strong>.</p></div>`}
  `;
}

function updateCartFab(items = getCartItems()) {
  const count = document.getElementById("events-cart-count");
  const fab = document.getElementById("events-cart-fab");
  if (count) count.textContent = String(items.length);
  if (fab) fab.classList.toggle("has-items", items.length > 0);
}

export function openCart() {
  renderCartPanel();
  document.getElementById("events-cart-overlay")?.classList.add("active");
  isCartOpen = true;
}

export function closeCart() {
  document.getElementById("events-cart-overlay")?.classList.remove("active");
  isCartOpen = false;
}

function handleAddToCart(eventId) {
  const ev = getEventById(eventId);
  if (!ev) return;
  try {
    addToCart(ev.id);
    flashToast(`${ev.title} added to cart`);
  } catch (err) {
    flashToast(err.message);
  }
  refreshEventsGrid();
  if (isDossierOpen) openEventDossier(ev.id);
}

function flashToast(message) {
  let toast = document.getElementById("events-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "events-toast";
    toast.className = "events-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(flashToast._t);
  flashToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ----------------------------------------------------------------------------
// CHECKOUT (details → teams → review & pay → done)
// ----------------------------------------------------------------------------

function startCheckout() {
  const items = getCartItems();
  if (!items.length) return;
  const user = getCurrentUser();
  if (!user) {
    resumeCheckoutUntil = Date.now() + 3 * 60 * 1000;
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
  };
  closeCart();
  openCheckoutModal();
}

function openJoinTeam(eventId) {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal("login");
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
  document.getElementById("event-reg-modal")?.classList.add("active");
  isCheckoutOpen = true;
  renderCheckout();
}

export function closeCheckout() {
  document.getElementById("event-reg-modal")?.classList.remove("active");
  isCheckoutOpen = false;
  checkout = null;
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
    .map((s, i) => `<li class="${i === current ? "current" : i < current ? "done" : ""}">${i + 1}. ${names[s]}</li>`)
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
      <label class="event-reg-label" for="co-college">College / institute *</label>
      <input type="text" class="event-reg-input" id="co-college" maxlength="120" value="${e(d.college)}" autocomplete="organization" placeholder="e.g. HPTU Hamirpur" />
    </div>
    <div class="checkout-row">
      <div class="event-reg-group">
        <label class="event-reg-label" for="co-year">Year *</label>
        <select class="event-reg-input" id="co-year">${yearOptionsHtml(d.year)}</select>
      </div>
      <div class="event-reg-group">
        <label class="event-reg-label" for="co-phone">Phone (WhatsApp) *</label>
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
  if (!d.displayName) throw new Error("Please enter your name.");
  if (!d.college) throw new Error("Please enter your college / institute.");
  if (!d.year) throw new Error("Please select your year.");
  if (d.phone.replace(/\D/g, "").length < 10) throw new Error("Please enter a valid phone number.");
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
      if (size < ev.minTeam) throw new Error(`${ev.title} needs at least ${ev.minTeam} members including you.`);
      if (size > ev.maxTeam) throw new Error(`${ev.title} allows at most ${ev.maxTeam} members including you.`);
    });
}

function renderCheckout() {
  const card = document.getElementById("event-reg-card");
  if (!card || !checkout) return;
  const user = getCurrentUser();
  const step = checkout.step;
  let body = "";

  if (step === "details") {
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">STEP 1 // CONFIRM YOUR DETAILS</span>
        <h3 class="event-reg-title">Your details</h3>
        <p class="event-reg-sub">These appear on your registrations and Digital ID.</p>
      </div>
      <form class="event-reg-form" id="co-form" novalidate>
        ${detailsFieldsHtml(checkout.details, user)}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          <button type="button" class="event-submit-btn secondary" data-action="co-back-cart">[ ← CART ]</button>
          <button type="submit" class="event-submit-btn">[ NEXT → ]</button>
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
              <label class="event-reg-label">Team name *</label>
              <input type="text" class="event-reg-input co-team-name" maxlength="60" value="${e(t.teamName)}" placeholder="e.g. ByteBusters" />
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
        <h3 class="event-reg-title">Team details</h3>
        <p class="event-reg-sub">You'll get a team code to share. Teammates can use it to link their own accounts.</p>
      </div>
      <form class="event-reg-form" id="co-form" novalidate>
        ${blocks}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          <button type="button" class="event-submit-btn secondary" data-action="co-prev">[ ← BACK ]</button>
          <button type="submit" class="event-submit-btn">[ NEXT → ]</button>
        </div>
      </form>`;
  } else if (step === "review") {
    const total = getCartTotal(checkout.items);
    const rows = checkout.items
      .map(
        ({ event: ev, mode, amount }) => `
        <li><span>${e(ev.title)} <em>${mode === "team" ? `TEAM · ${e(checkout.teams[ev.id]?.teamName || "")}` : "SOLO"}</em></span><strong>${amount ? `₹${e(amount)}` : "FREE"}</strong></li>`
      )
      .join("");
    const payReady = isPaymentConfigured();
    const upiLink = total > 0 ? buildUpiLink(total, `${FEST_CONFIG.name} registration`) : null;
    const paymentHtml =
      total <= 0
        ? `<div class="event-reg-free-note">✓ NO PAYMENT NEEDED</div>`
        : payReady
          ? `<div class="event-upi-payment-box">
              <div class="event-upi-amount">PAY ₹${e(total)} TO COMPLETE REGISTRATION</div>
              ${FEST_CONFIG.upiQrImage ? `<div class="event-qr-display"><img src="${e(FEST_CONFIG.upiQrImage)}" alt="UPI QR code" /></div>` : ""}
              ${upiLink ? `<a class="event-upi-app-btn" href="${e(upiLink)}">[ PAY ₹${e(total)} WITH A UPI APP ]</a>` : ""}
              <div class="event-upi-id-copy"><span>UPI ID: <strong>${e(FEST_CONFIG.upiId)}</strong></span></div>
              <p class="event-upi-help">After paying, enter the 12-digit UTR from the receipt. The fest team checks it against the bank statement before your booking shows as confirmed.</p>
              <div class="event-reg-group">
                <label class="event-reg-label" for="co-utr">12-digit UTR *</label>
                <input type="text" class="event-reg-input event-reg-utr" id="co-utr" inputmode="numeric" maxlength="12" autocomplete="off" value="${e(checkout.utr || "")}" />
              </div>
            </div>`
          : `<div class="event-reg-closed-note"><strong>TOTAL: ₹${e(total)}</strong><span>Online payment opens soon. Paid registrations will be enabled once the official UPI details are published.</span></div>`;
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">STEP ${stepList().length} // CONFIRM & PAY</span>
        <h3 class="event-reg-title">Confirm registration</h3>
        <p class="event-reg-sub">${e(checkout.details.displayName)} · ${e(checkout.details.college)} · ${e(checkout.details.year)}</p>
      </div>
      <ul class="checkout-summary">${rows}</ul>
      <div class="checkout-total"><span>TOTAL</span><strong>${total ? `₹${e(total)}` : "FREE"}</strong></div>
      <form class="event-reg-form" id="co-form" novalidate>
        ${paymentHtml}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          <button type="button" class="event-submit-btn secondary" data-action="co-prev">[ ← BACK ]</button>
          <button type="submit" class="event-submit-btn" id="co-submit" ${total > 0 && !payReady ? "disabled" : ""}>[ CONFIRM REGISTRATION ]</button>
        </div>
      </form>`;
  } else if (step === "done") {
    const r = checkout.result;
    const pending = r.total > 0 || r.teamPending;
    const codes = Object.entries(r.teamCodes || {})
      .map(([id, code]) => `<li><span>${e(getEventById(id)?.title || id)}</span><strong class="mono">${e(code)}</strong></li>`)
      .join("");
    body = `
      <div class="event-reg-head">
        <span class="event-pass-status ${pending ? "pending" : "ok"}">${r.teamPending ? "⏳ TEAM PAYMENT PENDING" : pending ? "⏳ PAYMENT VERIFICATION PENDING" : "✓ REGISTERED"}</span>
        <h3 class="event-reg-title">You're in!</h3>
        <p class="event-reg-sub">${r.joinedTeam ? `You joined team ${e(r.joinedTeam)}.` : `Registered for ${r.eventIds.length} event${r.eventIds.length > 1 ? "s" : ""}.`}${r.total > 0 ? " Your bookings will show as confirmed once the fest team verifies your payment." : r.teamPending ? " Your booking is confirmed once the fest team verifies your leader's payment." : ""}</p>
      </div>
      ${codes ? `<div class="checkout-codes"><span class="event-reg-label">Share these team codes with your teammates</span><ul>${codes}</ul></div>` : ""}
      <div class="checkout-nav">
        <button type="button" class="event-submit-btn secondary" data-action="co-close">[ BACK TO EVENTS ]</button>
        <button type="button" class="event-submit-btn" data-action="co-my-registrations">[ MY REGISTRATIONS ]</button>
      </div>`;
  } else if (step === "join") {
    const ev = getEventById(checkout.joinEventId);
    body = `
      <div class="event-reg-head">
        <span class="event-reg-kicker">JOIN A TEAM</span>
        <h3 class="event-reg-title">${e(ev.title)}</h3>
        <p class="event-reg-sub">Enter the code your team leader received after registering.</p>
      </div>
      <form class="event-reg-form" id="co-form" novalidate>
        <div class="event-reg-group">
          <label class="event-reg-label" for="co-code">Team code *</label>
          <input type="text" class="event-reg-input event-reg-code" id="co-code" maxlength="11" autocomplete="off" placeholder="e.g. BYTE-4F8K" />
        </div>
        ${detailsFieldsHtml(checkout.details, user)}
        <div class="event-reg-error" id="co-error" role="alert" hidden></div>
        <div class="checkout-nav">
          <button type="button" class="event-submit-btn secondary" data-action="co-close">[ CANCEL ]</button>
          <button type="submit" class="event-submit-btn" id="co-submit">[ JOIN TEAM ]</button>
        </div>
      </form>`;
  }

  card.innerHTML = `
    <button class="event-reg-close" data-action="co-close" aria-label="Close">[ ESC / CLOSE ]</button>
    ${stepperHtml()}
    <div class="checkout-step" key="${step}">${body}</div>
  `;

  const form = card.querySelector("#co-form");
  const utr = card.querySelector("#co-utr");
  if (utr) utr.oninput = () => (utr.value = utr.value.replace(/\D/g, "").slice(0, 12));
  if (form) form.onsubmit = (evt) => onCheckoutSubmit(evt, card);
}

async function onCheckoutSubmit(evt, card) {
  evt.preventDefault();
  const errBox = card.querySelector("#co-error");
  errBox.hidden = true;
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
      const total = getCartTotal(checkout.items);
      checkout.utr = card.querySelector("#co-utr")?.value.trim() || "";
      if (total > 0 && !UTR_PATTERN.test(checkout.utr)) throw new Error("Enter the 12-digit UTR from your UPI payment receipt.");
      const btn = card.querySelector("#co-submit");
      btn.disabled = true;
      btn.textContent = "[ SAVING... ]";
      const result = await checkoutCart(
        checkout.items.map((i) => ({ eventId: i.eventId, mode: i.mode })),
        checkout.details,
        checkout.teams,
        checkout.utr
      );
      clearCart(result.eventIds);
      checkout.result = result;
      checkout.step = "done";
      refreshEventsGrid();
      return renderCheckout();
    }
    if (checkout.step === "join") {
      readDetails(card);
      const code = card.querySelector("#co-code").value.trim();
      if (!code) throw new Error("Please enter your team code.");
      const btn = card.querySelector("#co-submit");
      btn.disabled = true;
      btn.textContent = "[ JOINING... ]";
      const joined = await joinTeamWithCode(code, getEventById(checkout.joinEventId), checkout.details);
      removeFromCart(checkout.joinEventId);
      const teamPaid = ["free", "paid", "verified"].includes(joined.team?.paymentStatus || "free");
      checkout.result = { total: 0, eventIds: [checkout.joinEventId], teamCodes: {}, joinedTeam: joined.team?.teamName, teamPending: !teamPaid };
      checkout.step = "done";
      refreshEventsGrid();
      return renderCheckout();
    }
  } catch (err) {
    errBox.textContent = err.message || "Something went wrong. Please try again.";
    errBox.hidden = false;
    const btn = card.querySelector("#co-submit");
    if (btn) {
      btn.disabled = false;
      btn.textContent = checkout.step === "join" ? "[ JOIN TEAM ]" : "[ CONFIRM REGISTRATION ]";
    }
  }
}

function onCheckoutClick(evt) {
  const card = document.getElementById("event-reg-card");
  const btn = evt.target.closest("[data-action]");
  if (!btn || !checkout || !card?.contains(btn)) return;
  const action = btn.dataset.action;
  const steps = stepList();

  if (action === "co-close") return closeCheckout();
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
    return renderCheckout();
  }
  if (action === "co-my-registrations") {
    closeCheckout();
    if (typeof window.openProfilePanel === "function") window.openProfilePanel("registrations");
  }
}

/**
 * Fast cascade reveal for newly rendered event cards
 */
export function triggerCardsReveal() {
  if (typeof document === "undefined") return;
  const cards = Array.from(document.querySelectorAll(".event-card"));
  if (!cards.length) return;

  // Stagger reveal for visible cards
  cards.forEach((card, index) => {
    const delay = Math.min((index % 4) * 60, 240);
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
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? Math.min(Math.max((scrollTop / scrollHeight) * 100, 0), 100) : 0;

        // Top edge progress accent
        if (progressBar) {
          progressBar.style.width = `${progress.toFixed(1)}%`;
        }

        // Pinned sticky toolbar morphing state
        if (toolbar) {
          if (scrollTop > 160) {
            toolbar.classList.add("is-pinned");
          } else {
            toolbar.classList.remove("is-pinned");
          }
        }

        // Floating Brutalist HUD
        if (scrollHud) {
          if (scrollTop > 220) {
            scrollHud.classList.add("active");
            if (scrollCounter) {
              scrollCounter.textContent = `${Math.round(progress)}% EXPLORED`;
            }
          } else {
            scrollHud.classList.remove("active");
          }
        }

        // Hero Ambient Parallax (fade & subtle vertical shift)
        if (!reduceMotion && heroCoords && scrollTop < 600) {
          heroCoords.style.transform = `translate3d(0, ${scrollTop * 0.15}px, 0)`;
        }
        if (!reduceMotion && heroTitle && scrollTop < 600) {
          const scale = Math.max(1 - scrollTop / 1200, 0.9);
          const opacity = Math.max(1 - scrollTop / 500, 0.4);
          heroTitle.style.transform = `scale(${scale})`;
          heroTitle.style.opacity = `${opacity}`;
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 2. Card In-View Scroll Reveal
  const setupCardAnimations = () => {
    const cards = Array.from(document.querySelectorAll(".event-card"));
    if (!cards.length) return;

    if (reduceMotion) {
      cards.forEach((c) => c.classList.add("is-revealed"));
      return;
    }

    // Check for GSAP + ScrollTrigger
    const gsap = window.gsap;
    const ScrollTrigger = gsap?.core?.globals()?.ScrollTrigger || window.ScrollTrigger;

    if (gsap && ScrollTrigger) {
      try {
        gsap.registerPlugin(ScrollTrigger);
        cards.forEach((card, index) => {
          if (card.classList.contains("is-revealed")) return;

          ScrollTrigger.create({
            trigger: card,
            start: "top 88%",
            once: true,
            onEnter: () => {
              const delay = (index % 3) * 0.06;
              gsap.to(card, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: finePointer ? 0.5 : 0.35,
                delay: delay,
                ease: "power2.out",
                onComplete: () => {
                  card.classList.add("is-revealed");
                  card.style.transform = "";
                },
              });
            },
          });
        });
        return;
      } catch (e) {
        console.warn("GSAP ScrollTrigger fallback:", e);
      }
    }

    // High performance IntersectionObserver fallback
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const card = entry.target;
              observer.unobserve(card);
              const idx = cards.indexOf(card);
              const delay = (idx % 3) * 60;
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
  const onMouseMove = (e) => {
    const card = e.target.closest(".event-card.is-revealed");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = -(y / (rect.height / 2)) * 3.5;
    const rotY = (x / (rect.width / 2)) * 3.5;
    card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-5px) scale(1.01)`;
  };

  const onMouseLeave = (e) => {
    const card = e.target.closest(".event-card.is-revealed");
    if (card) {
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
  grid.innerHTML = renderGridHtml(filterEvents(activeCategory, activeSearchQuery));
  triggerCardsReveal();
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
        return id && openEventDossier(id);
      case "add-to-cart":
        return id && handleAddToCart(id);
      case "open-cart":
        closeEventDossier();
        return openCart();
      case "view-booking":
        closeEventDossier();
        if (typeof window.openProfilePanel === "function") window.openProfilePanel("registrations");
        return;
      case "join-team":
        return id && openJoinTeam(id);
      case "cart-close":
        return closeCart();
      case "cart-remove":
        removeFromCart(id);
        renderCartPanel();
        return refreshEventsGrid();
      case "cart-mode":
        setCartItemMode(id, btn.dataset.mode);
        return renderCartPanel();
      case "cart-done":
        return startCheckout();
      default:
        return onCheckoutClick(evt);
    }
  });

  document.addEventListener("keydown", (evt) => {
    if (evt.key !== "Escape" || evt.defaultPrevented) return;
    // The profile overlay / auth modal handle their own Escape.
    if (document.documentElement.classList.contains("pp-open")) return;
    if (document.getElementById("chaitanya-auth-backdrop")?.classList.contains("active")) return;
    if (isCheckoutOpen) closeCheckout();
    else if (isCartOpen) closeCart();
    else if (isDossierOpen) closeEventDossier();
  });

  subscribeAuthState((user) => {
    setCartOwner(user?.uid);
    pruneRegisteredFromCart();
    if (document.getElementById("events-card-grid")) refreshEventsGrid();
    if (user && resumeCheckoutUntil > Date.now()) {
      resumeCheckoutUntil = 0;
      setTimeout(() => {
        if (document.getElementById("event-reg-modal")) startCheckout();
      }, 300);
    }
  });

  subscribeCart((items) => {
    updateCartFab(items);
    if (isCartOpen) renderCartPanel();
  });
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

  const catBar = document.getElementById("events-cat-bar");
  catBar?.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".events-cat-btn");
    if (!btn?.dataset.cat) return;
    activeCategory = btn.dataset.cat;
    catBar.querySelectorAll(".events-cat-btn").forEach((b) => b.classList.toggle("active", b === btn));
    refreshEventsGrid();
  });

  const searchBox = document.getElementById("events-search-box");
  const clearBtn = document.getElementById("events-search-clear-btn");
  searchBox?.addEventListener("input", (evt) => {
    activeSearchQuery = evt.target.value || "";
    clearBtn?.classList.toggle("active", Boolean(activeSearchQuery));
    refreshEventsGrid();
  });
  clearBtn?.addEventListener("click", () => {
    if (searchBox) searchBox.value = "";
    activeSearchQuery = "";
    clearBtn.classList.remove("active");
    refreshEventsGrid();
  });

  document.getElementById("events-cart-fab")?.addEventListener("click", openCart);

  const outside = [
    ["event-dossier-overlay", closeEventDossier],
    ["events-cart-overlay", closeCart],
    ["event-reg-modal", closeCheckout],
  ];
  outside.forEach(([id, close]) => {
    const el = document.getElementById(id);
    el?.addEventListener("click", (evt) => evt.target === el && close());
  });

  setCartOwner(getCurrentUser()?.uid);
  pruneRegisteredFromCart();
  updateCartFab();
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
  checkout = null;
}

// Compatibility: older code paths call openEventRegistration(eventId).
export function openEventRegistration(eventId) {
  const ev = getEventById(eventId);
  if (!ev) return;
  if (isEventRegistered(ev.id)) return window.openProfilePanel?.("registrations");
  if (isRegistrationOpen(ev)) handleAddToCart(ev.id);
}

if (typeof window !== "undefined") {
  window.openEventDossier = openEventDossier;
  window.openEventRegistration = openEventRegistration;
  window.openEventsCart = openCart;
  window.initEventsPage = initEventsPage;
  window.initScrollMotion = initScrollMotion;
  window.triggerCardsReveal = triggerCardsReveal;
  window.renderEventsPageHtml = renderEventsPageHtml;
}
