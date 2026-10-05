/**
 * ============================================================================
 * Chaitanya 2k26 — Events Page Component & Interactive Controller
 * ============================================================================
 * Provides:
 * - Dedicated /events page layout with brutalist hero & sticky toolbar
 * - Real-time category filtering & live search
 * - Interactive Rules & Regulations Dossier Drawer
 * - Solo & Team Registration Modal with UPI payment + UTR submission
 * - Reactive button state synchronization with Firebase Auth
 */

import {
  getEventCatalog,
  getEventById,
  getCategories,
  filterEvents,
  isRegistrationOpen,
} from "./events-data.js";

import {
  getCurrentUser,
  subscribeAuthState,
  registerSoloForEvent,
  createTeamForEvent,
  joinTeamWithCode,
  isEventRegistered,
  getMyRegistration,
  resubmitPaymentUtr,
} from "./auth-service.js";

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
let activeDossierEvent = null;
let isRegModalOpen = false;
let activeRegEvent = null;
let pendingRegistrationEventId = null;
let pendingAuthUnsubscribe = null;

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

  const eventsHtml = events.length > 0
    ? events.map((ev) => renderEventCardHtml(ev)).join("")
    : `
      <div class="events-empty">
        <h3>No Arenas Found</h3>
        <p>No competitions match your current search or category filter. Try clearing your search.</p>
      </div>
    `;

  return `
    <div class="events-page-root" id="chaitanya-events-page">
      <!-- Top Scroll Progress Bar -->
      <div id="events-scroll-progress"></div>

      <div class="events-container">
        <!-- 1. Hero Section -->
        <div class="events-hero">
          <span class="events-hero-coords">[ 31.7088° N, 76.5273° E // HPTU HAMIRPUR ]</span>
          <span class="events-hero-tag">CHAITANYA 2K26 // SCHEDULE & COMPETITIONS</span>
          <h1 class="events-hero-title">EVENTS & COMPETITIONS</h1>
          <p class="events-hero-subtitle">
            EXPLORE ${e(getCategories().find((c) => c.id === "all")?.count || "")} EVENTS ACROSS CODING, DESIGN, BUSINESS, ESPORTS & CULTURE.
            FIND YOUR EVENT, MEET THE STUDENT HEADS & GET READY FOR THE FEST.
          </p>
          <div class="events-stats-strip">
            <span class="events-stat-pill highlight">[ ${e(getCategories().find((c) => c.id === "all")?.count || "")} EVENTS ]</span>
            <span class="events-stat-pill">[ ${e(FEST_CONFIG.festDays || 2)} DAYS // ${e(getFestDatesLabel())} ]</span>
            <span class="events-stat-pill">[ HPTU HAMIRPUR ]</span>
          </div>
          <p class="events-hero-note">Entry fees, prizes and registration details will be notified soon. Timings and venues may change.</p>
        </div>

        <!-- 2. Sticky Category Toolbar & Search -->
        <div class="events-toolbar">
          <div class="events-categories" id="events-cat-bar">
            ${categoriesHtml}
          </div>
          <div class="events-search-wrap">
            <input 
              type="text" 
              class="events-search-input" 
              id="events-search-box" 
              placeholder="SEARCH COMPETITIONS, VENUES, PRIZES..." 
              value="${e(activeSearchQuery)}"
            />
            <button class="events-search-clear ${activeSearchQuery ? "active" : ""}" id="events-search-clear-btn">✕</button>
          </div>
        </div>

        <!-- 3. Event Cards Grid -->
        <div class="events-grid" id="events-card-grid">
          ${eventsHtml}
        </div>
      </div>

      <!-- 4. Floating Brutalist Scroll HUD -->
      <div class="events-scroll-hud" id="events-scroll-hud">
        <div class="events-scroll-metric">
          <span class="pulse-dot"></span>
          <span id="events-scroll-counter">${e(getCategories().find((c) => c.id === "all")?.count || "")} EVENTS</span>
        </div>
        <button class="events-scroll-top-btn" id="events-scroll-top-btn" title="Return to Top">
          [ ↑ TOP ]
        </button>
      </div>

      <!-- 5. Interactive Event Dossier Drawer -->
      <div class="event-dossier-overlay" id="event-dossier-overlay">
        <div class="event-dossier-panel" id="event-dossier-panel">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- 6. Registration & Payment Modal -->
      <div class="event-reg-modal" id="event-reg-modal">
        <div class="event-reg-card" id="event-reg-card">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>
  `;
}

/**
 * Render single event card
 */
function renderEventCardHtml(ev) {
  const isRegistered = isEventRegistered(ev.title) || isEventRegistered(ev.id);
  const catObj = getCategories().find((c) => c.id === ev.category);
  const accentColor = catObj ? catObj.accent || "#000000" : "#000000";

  return `
    <div class="event-card" data-event-id="${e(ev.id)}">
      <span class="corner corner-tl">+</span>
      <span class="corner corner-tr">+</span>
      <span class="corner corner-bl">+</span>
      <span class="corner corner-br">+</span>

      <div class="event-card-header">
        <span class="event-badge-category" style="color:${accentColor}; border-color:${accentColor};">
          ${e(ev.categoryName)}
        </span>
        <span class="event-badge-format">${e(ev.format)}</span>
      </div>

      <h2 class="event-card-title">${e(ev.title)}</h2>
      <p class="event-card-tagline">${e(ev.tagline)}</p>

      <div class="event-card-meta">
        <div class="event-meta-row">
          <span class="event-meta-label">SCHEDULE:</span>
          <span class="event-meta-val">${e(ev.date)} | ${e(ev.time)}</span>
        </div>
        <div class="event-meta-row">
          <span class="event-meta-label">VENUE:</span>
          <span class="event-meta-val">${e(ev.venue)}</span>
        </div>
        <div class="event-meta-row">
          <span class="event-meta-label">PRIZE POOL:</span>
          <span class="event-meta-val prize">${e(ev.prizePool)}</span>
        </div>
        <div class="event-meta-row">
          <span class="event-meta-label">ENTRY FEE:</span>
          <span class="event-meta-val">${e(ev.entryFee)}</span>
        </div>
      </div>

      <div class="event-card-actions">
        <button class="event-btn-details" data-action="view-details" data-event-id="${e(ev.id)}">
          [ VIEW DETAILS ]
        </button>
        ${isRegistered
          ? `<button class="event-btn-register registered" data-action="register-event" data-event-id="${e(ev.id)}">[ ✓ REGISTERED ]</button>`
          : isRegistrationOpen(ev)
            ? `<button class="event-btn-register" data-action="register-event" data-event-id="${e(ev.id)}">[ REGISTER NOW ]</button>`
            : `<button class="event-btn-register is-closed" disabled aria-disabled="true">[ REGISTRATION SOON ]</button>`}
      </div>
    </div>
  `;
}

/**
 * Open Event Details Dossier Drawer
 */
export function openEventDossier(eventId) {
  const ev = getEventById(eventId);
  if (!ev) return;

  activeDossierEvent = ev;
  const overlay = document.getElementById("event-dossier-overlay");
  const panel = document.getElementById("event-dossier-panel");
  if (!overlay || !panel) return;

  const isRegistered = isEventRegistered(ev.title) || isEventRegistered(ev.id);
  const catObj = getCategories().find((c) => c.id === ev.category);
  const accentColor = catObj ? catObj.accent || "#000000" : "#000000";

  const rulesHtml = (ev.rules || []).map((r) => `<li>${e(r)}</li>`).join("");

  const roundsHtml = (ev.rounds || [])
    .map(
      (rnd) => `
      <div style="background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:10px 12px; margin-bottom:8px;">
        <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; color:#000;">${e(rnd.name)}</div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:10px; color:#666; margin-bottom:4px;">${e(rnd.time)}</div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:#333;">${e(rnd.description)}</div>
      </div>
    `
    )
    .join("");

  const rubricHtml = (ev.judgingCriteria || [])
    .map(
      (jc) => `
      <div style="display:flex; justify-content:space-between; font-family:'IBM Plex Mono',monospace; font-size:11px; padding:4px 0; border-bottom:1px dashed rgba(0,0,0,0.1);">
        <span>${e(jc.name)}</span>
        <span style="font-weight:700;">${e(jc.weight)}</span>
      </div>
    `
    )
    .join("");

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
          ${c.phone ? `<a href="tel:${e(c.phone.replace(/[^+\d]/g, ""))}" class="event-coord-btn">📞 CALL</a>` : ""}
          ${c.whatsapp ? `<a href="${e(c.whatsapp)}" target="_blank" rel="noopener noreferrer" class="event-coord-btn" style="background:#25D366; color:#fff; border-color:#25D366;">💬 WHATSAPP</a>` : ""}
          ${!c.phone && !c.whatsapp ? `<a href="mailto:${e(FEST_CONFIG.contactEmail)}?subject=${encodeURIComponent(`${ev.title} (attn: ${c.name})`)}" class="event-coord-btn">✉ EMAIL</a>` : ""}
        </div>
      </div>
    `
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
      </div>
    `;

  panel.innerHTML = `
    <button class="event-dossier-close" id="dossier-close-btn">[ ESC / CLOSE ]</button>
    
    <div>
      <span class="event-dossier-badge" style="color:${accentColor}; border-color:${accentColor};">
        ${e(ev.categoryName)} // ${e(ev.badge)}
      </span>
      <h2 class="event-dossier-title">${e(ev.title)}</h2>
      <p class="event-dossier-tagline">${e(ev.tagline)}</p>
    </div>

    <!-- Key Specs -->
    <div class="event-dossier-specs">
      <div class="event-spec-item">
        <span class="event-spec-k">PRIZE POOL</span>
        <span class="event-spec-v" style="color:#005a3c; font-weight:700;">${e(ev.prizePool)}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">ENTRY FEE</span>
        <span class="event-spec-v">${e(ev.entryFee)}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">SCHEDULE</span>
        <span class="event-spec-v">${e(ev.date)} · ${e(ev.time)}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">VENUE</span>
        <span class="event-spec-v">${e(ev.venue)}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">TEAM FORMAT</span>
        <span class="event-spec-v">${e(ev.format)}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">STATUS</span>
        <span class="event-spec-v" style="color:#005a3c;">${e(ev.status)}</span>
      </div>
    </div>

    <!-- Section: Overview -->
    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ 01. OVERVIEW & OBJECTIVE ]</h4>
      <p class="event-dossier-text">${e(ev.overview)}</p>
    </div>

    <!-- Section: Rules -->
    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ 02. RULES & GUIDELINES ]</h4>
      <ul class="event-dossier-list">
        ${rulesHtml}
      </ul>
    </div>

    <!-- Section: Rounds -->
    ${roundsHtml ? `
      <div class="event-dossier-section">
        <h4 class="event-dossier-heading">[ 03. ROUNDS & SCHEDULE TIMELINE ]</h4>
        <div>${roundsHtml}</div>
      </div>
    ` : ""}

    <!-- Section: Rubric -->
    ${rubricHtml ? `
      <div class="event-dossier-section">
        <h4 class="event-dossier-heading">[ 04. JUDGING CRITERIA & SCORING ]</h4>
        <div style="background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:12px;">
          ${rubricHtml}
        </div>
      </div>
    ` : ""}

    <!-- Section: Coordinators -->
    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ 05. STUDENT HEADS & CONTACT ]</h4>
      <div>${coordinatorsHtml}</div>
    </div>

    <!-- Direct CTA -->
    ${isRegistered || isRegistrationOpen(ev) ? `
    <button class="event-submit-btn" id="dossier-action-btn" data-event-id="${e(ev.id)}" style="width:100%; margin-top:20px;">
      ${isRegistered ? "[ ✓ ALREADY REGISTERED // VIEW TICKET ]" : `[ REGISTER FOR ${e(ev.title)} ]`}
    </button>` : `
    <button class="event-submit-btn" disabled style="width:100%; margin-top:20px;">
      [ REGISTRATION: TO BE NOTIFIED ]
    </button>`}
  `;

  overlay.classList.add("active");
  isDossierOpen = true;

  // Bind close buttons
  const closeBtn = panel.querySelector("#dossier-close-btn");
  if (closeBtn) closeBtn.onclick = closeEventDossier;

  const actionBtn = panel.querySelector("#dossier-action-btn");
  if (actionBtn) {
    actionBtn.onclick = () => {
      closeEventDossier();
      openEventRegistration(ev.id);
    };
  }
}

export function closeEventDossier() {
  const overlay = document.getElementById("event-dossier-overlay");
  if (overlay) overlay.classList.remove("active");
  isDossierOpen = false;
  activeDossierEvent = null;
}

/**
 * Open Event Registration & Payment Modal
 */
export function openEventRegistration(eventId) {
  const user = getCurrentUser();
  const ev = getEventById(eventId);
  if (!ev) return;
  if (!isRegistrationOpen(ev) && !isEventRegistered(ev.id)) return;

  // Not signed in: ask for Google sign-in, then continue to this event's form.
  if (!user) {
    pendingRegistrationEventId = ev.id;
    if (!pendingAuthUnsubscribe) {
      pendingAuthUnsubscribe = subscribeAuthState((u) => {
        if (!u || !pendingRegistrationEventId) return;
        const nextId = pendingRegistrationEventId;
        pendingRegistrationEventId = null;
        setTimeout(() => {
          if (document.getElementById("event-reg-modal")) {
            refreshEventsGrid();
            openEventRegistration(nextId);
          }
        }, 300);
      });
    }
    openAuthModal("login");
    return;
  }

  // If already registered, show confirmed ticket pass
  if (isEventRegistered(ev.title) || isEventRegistered(ev.id)) {
    activeRegEvent = ev;
    const modal = document.getElementById("event-reg-modal");
    const card = document.getElementById("event-reg-card");
    if (modal && card) {
      renderRegistrationPass(card, ev);
      modal.classList.add("active");
      isRegModalOpen = true;
    }
    return;
  }

  activeRegEvent = ev;
  const modal = document.getElementById("event-reg-modal");
  const card = document.getElementById("event-reg-card");
  if (!modal || !card) return;

  const isTeam = ev.maxTeam > 1;
  const fee = Number(ev.entryFeeNum) || 0;
  const paymentReady = isPaymentConfigured();
  const upiLink = fee > 0 ? buildUpiLink(fee, `${FEST_CONFIG.name} ${ev.title}`) : null;

  const paymentHtml = fee <= 0
    ? `
      <div class="event-reg-free-note">✓ FREE EVENT — NO ENTRY FEE</div>
    `
    : paymentReady
      ? `
      <div class="event-upi-payment-box" id="reg-payment-box">
        <div class="event-upi-amount">ENTRY FEE: ₹${e(fee)}${isTeam ? " PER TEAM (PAID BY LEADER)" : ""}</div>
        ${FEST_CONFIG.upiQrImage ? `
          <div class="event-qr-display">
            <img src="${e(FEST_CONFIG.upiQrImage)}" alt="UPI QR code for ${e(FEST_CONFIG.upiId)}" />
          </div>` : ""}
        ${upiLink ? `<a class="event-upi-app-btn" href="${e(upiLink)}">[ PAY ₹${e(fee)} WITH A UPI APP ]</a>` : ""}
        <div class="event-upi-id-copy">
          <span>UPI ID: <strong>${e(FEST_CONFIG.upiId)}</strong></span>
          <button type="button" class="event-upi-copy-btn" id="copy-upi-btn">[ COPY ]</button>
        </div>
        <p class="event-upi-help">
          Pay exactly ₹${e(fee)} using GPay, PhonePe, Paytm or any UPI app, then enter the 12-digit
          UTR / UPI reference number from the payment receipt. The fest team checks every UTR
          against the bank statement before your pass is marked verified.
        </p>
        <div class="event-reg-group">
          <label class="event-reg-label" for="reg-utr-number">12-digit UPI transaction ID (UTR) *</label>
          <input type="text" class="event-reg-input event-reg-utr" id="reg-utr-number"
            inputmode="numeric" autocomplete="off" pattern="\\d{12}" maxlength="12"
            placeholder="e.g. 412345678901" />
        </div>
      </div>
    `
      : `
      <div class="event-reg-closed-note" id="reg-payment-box">
        <strong>ENTRY FEE: ₹${e(fee)}${isTeam ? " PER TEAM" : ""}</strong>
        <span>Online payment opens soon. Paid registrations will be enabled once the official
        UPI details are published. Questions? <a href="mailto:${e(FEST_CONFIG.contactEmail)}">${e(FEST_CONFIG.contactEmail)}</a></span>
      </div>
    `;

  card.innerHTML = `
    <button class="event-reg-close" id="reg-modal-close-btn" aria-label="Close">[ ESC / CLOSE ]</button>
    <div class="event-reg-head">
      <span class="event-reg-kicker">CHAITANYA 2K26 // EVENT REGISTRATION</span>
      <h3 class="event-reg-title">${e(ev.title)}</h3>
      <p class="event-reg-sub">
        ${isTeam ? `Team event · ${e(ev.format)} · up to ${e(ev.maxTeam)} members` : "Individual registration"}
      </p>
    </div>

    <form class="event-reg-form" id="event-reg-form" novalidate>
      ${isTeam ? `
        <fieldset class="event-reg-group event-reg-mode">
          <legend class="event-reg-label">How are you registering?</legend>
          <label><input type="radio" name="team_mode" value="create" checked /> I'm the team leader — create a team</label>
          <label><input type="radio" name="team_mode" value="join" /> Join my team with a code</label>
        </fieldset>
      ` : ""}

      <div id="create-team-fields">
        ${isTeam ? `
          <div class="event-reg-group">
            <label class="event-reg-label" for="reg-team-name">Team name *</label>
            <input type="text" class="event-reg-input" id="reg-team-name" maxlength="60" placeholder="e.g. ByteBusters" />
          </div>` : ""}
      </div>

      <div id="join-team-fields" hidden>
        <div class="event-reg-group">
          <label class="event-reg-label" for="reg-team-code">Team code *</label>
          <input type="text" class="event-reg-input event-reg-code" id="reg-team-code" maxlength="11" autocomplete="off" placeholder="e.g. BYTE-4F8K" />
          <span class="event-reg-hint">Your team leader sees this code after creating the team.</span>
        </div>
      </div>

      <div class="event-reg-group">
        <label class="event-reg-label" for="reg-name">Name</label>
        <input type="text" class="event-reg-input" id="reg-name" value="${e(user.displayName || "")}" readonly />
      </div>
      <div class="event-reg-group">
        <label class="event-reg-label" for="reg-phone">WhatsApp / contact number *</label>
        <input type="tel" class="event-reg-input" id="reg-phone" value="${e(user.phone || "")}" autocomplete="tel" maxlength="20" placeholder="+91 9XXXX XXXXX" />
      </div>
      <div class="event-reg-group">
        <label class="event-reg-label" for="reg-college">College / institute *</label>
        <input type="text" class="event-reg-input" id="reg-college" value="${e(user.college || "")}" maxlength="120" placeholder="e.g. HPTU Hamirpur" />
      </div>

      <div id="reg-payment-section">${paymentHtml}</div>

      <div id="reg-error-msg" class="event-reg-error" role="alert" hidden></div>

      <button type="submit" class="event-submit-btn" id="reg-submit-btn">
        [ CONFIRM REGISTRATION ]
      </button>
    </form>
  `;

  modal.classList.add("active");
  isRegModalOpen = true;

  const closeBtn = card.querySelector("#reg-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeEventRegistration;

  const createFields = card.querySelector("#create-team-fields");
  const joinFields = card.querySelector("#join-team-fields");
  const paymentSection = card.querySelector("#reg-payment-section");
  const submitBtn = card.querySelector("#reg-submit-btn");
  const errBox = card.querySelector("#reg-error-msg");

  const isJoinMode = () => card.querySelector('input[name="team_mode"]:checked')?.value === "join";
  // Paid registrations stay closed until the UPI account is configured,
  // except joining an existing team (the leader already paid).
  const syncMode = () => {
    const join = isJoinMode();
    if (createFields) createFields.hidden = join;
    if (joinFields) joinFields.hidden = !join;
    if (paymentSection) paymentSection.hidden = join;
    if (submitBtn) submitBtn.disabled = !join && fee > 0 && !paymentReady;
  };
  card.querySelectorAll('input[name="team_mode"]').forEach((r) => (r.onchange = syncMode));
  syncMode();

  const copyBtn = card.querySelector("#copy-upi-btn");
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(FEST_CONFIG.upiId);
        copyBtn.textContent = "[ COPIED ]";
      } catch {
        copyBtn.textContent = "[ COPY FAILED ]";
      }
      setTimeout(() => (copyBtn.textContent = "[ COPY ]"), 2000);
    };
  }

  const utrInput = card.querySelector("#reg-utr-number");
  if (utrInput) {
    utrInput.oninput = () => {
      utrInput.value = utrInput.value.replace(/\D/g, "").slice(0, 12);
    };
  }

  const form = card.querySelector("#event-reg-form");
  form.onsubmit = async (evt) => {
    evt.preventDefault();
    errBox.hidden = true;

    const phone = card.querySelector("#reg-phone").value.trim();
    const college = card.querySelector("#reg-college").value.trim();
    const utr = (utrInput?.value || "").trim();
    const join = isTeam && isJoinMode();

    try {
      if (!phone || phone.replace(/\D/g, "").length < 10) throw new Error("Please enter a valid contact number.");
      if (!college) throw new Error("Please enter your college / institute.");
      if (!join && fee > 0) {
        if (!paymentReady) throw new Error("Online payment for this event is not open yet.");
        if (!UTR_PATTERN.test(utr)) throw new Error("Enter the 12-digit UTR from your UPI payment receipt.");
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "[ SAVING REGISTRATION... ]";

      if (join) {
        const teamCode = card.querySelector("#reg-team-code").value.trim();
        if (!teamCode) throw new Error("Please enter your team code.");
        await joinTeamWithCode(teamCode, ev, { phone, college });
      } else if (isTeam) {
        const teamName = card.querySelector("#reg-team-name").value.trim();
        if (!teamName) throw new Error("Please enter your team name.");
        await createTeamForEvent(ev, { teamName, leaderPhone: phone, college }, { utr });
      } else {
        await registerSoloForEvent(ev, { utr, phone, college });
      }

      await renderRegistrationPass(card, ev);
      refreshEventsGrid();
    } catch (err) {
      errBox.textContent = err.message || "Registration failed. Please try again.";
      errBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "[ CONFIRM REGISTRATION ]";
    }
  };
}

const PAYMENT_BADGES = {
  free: { label: "✓ REGISTERED", tone: "ok", note: "Free event — show this pass at the venue." },
  team: { label: "✓ REGISTERED WITH TEAM", tone: "ok", note: "Your team leader's payment covers you." },
  verified: { label: "✓ PAYMENT VERIFIED", tone: "ok", note: "You're all set. Show this pass at the venue." },
  pending_verification: {
    label: "⏳ PAYMENT VERIFICATION PENDING",
    tone: "pending",
    note: "Your registration is saved. The fest team will verify your UTR; check back here for the status.",
  },
  team_pending_verification: {
    label: "⏳ TEAM PAYMENT PENDING",
    tone: "pending",
    note: "You're on the team. Your leader's payment is waiting for verification by the fest team.",
  },
  team_rejected: {
    label: "✕ TEAM PAYMENT NOT VERIFIED",
    tone: "bad",
    note: "Your team leader's UTR could not be verified. Ask your leader to open their pass and resubmit it.",
  },
  rejected: {
    label: "✕ PAYMENT NOT VERIFIED",
    tone: "bad",
    note: "We could not match your UTR. Re-enter the correct 12-digit UTR below.",
  },
};

async function renderRegistrationPass(card, ev) {
  card.innerHTML = `
    <button class="event-reg-close" id="pass-close-btn" aria-label="Close">[ ESC / CLOSE ]</button>
    <div class="event-pass-loading">Loading your pass...</div>
  `;
  card.querySelector("#pass-close-btn").onclick = closeEventRegistration;

  let record = null;
  try {
    record = await getMyRegistration(ev.id);
  } catch (err) {
    console.warn("Could not load registration:", err);
  }

  if (!record) {
    card.innerHTML = `
      <button class="event-reg-close" id="pass-close-btn" aria-label="Close">[ ESC / CLOSE ]</button>
      <div class="event-reg-head">
        <h3 class="event-reg-title">${e(ev.title)}</h3>
        <p class="event-reg-sub">We couldn't load your registration right now. Check your connection and try again,
        or email <a href="mailto:${e(FEST_CONFIG.contactEmail)}">${e(FEST_CONFIG.contactEmail)}</a>.</p>
      </div>
    `;
    card.querySelector("#pass-close-btn").onclick = closeEventRegistration;
    return;
  }

  const { registration, payment, team } = record;
  // Teammates can't read the leader's payment; use the team's payment status.
  const teamStatus = { paid: "verified", pending: "pending_verification", rejected: "rejected", free: "free" };
  let status = payment?.status || registration.payment_status || "free";
  if (status === "team" && team) {
    status = team.paymentStatus === "paid" || team.paymentStatus === "verified" || team.paymentStatus === "free"
      ? "team"
      : `team_${teamStatus[team.paymentStatus] || "pending_verification"}`;
  }
  const badge = PAYMENT_BADGES[status] || PAYMENT_BADGES.pending_verification;
  const isLeader = team && team.leaderUid === registration.user_id;

  card.innerHTML = `
    <button class="event-reg-close" id="pass-close-btn" aria-label="Close">[ ESC / CLOSE ]</button>
    <div class="event-pass">
      <span class="event-pass-status ${badge.tone}">${badge.label}</span>
      <h3 class="event-reg-title">${e(ev.title)}</h3>
      <p class="event-reg-sub">CHAITANYA 2K26 · ENTRY PASS</p>

      <div class="event-pass-ticket">
        <dl>
          <div><dt>NAME</dt><dd>${e(registration.user_name)}</dd></div>
          <div><dt>PASS ID</dt><dd class="mono">${e(registration.registration_qr_id)}</dd></div>
          <div><dt>WHEN</dt><dd>${e(ev.date)} · ${e(ev.time)}</dd></div>
          <div><dt>VENUE</dt><dd>${e(ev.venue)}</dd></div>
          ${team ? `<div><dt>TEAM</dt><dd>${e(team.teamName)} · ${e(team.teamSize)}/${e(team.maxTeamSize)} members</dd></div>` : ""}
          ${payment ? `<div><dt>UTR</dt><dd class="mono">${e(payment.transactionRef)}</dd></div>` : ""}
        </dl>
        ${isLeader ? `
          <div class="event-pass-code">
            <span>SHARE THIS TEAM CODE WITH YOUR TEAMMATES</span>
            <strong id="pass-team-code">${e(team.teamCode)}</strong>
            <button type="button" class="event-upi-copy-btn" id="copy-team-code-btn">[ COPY CODE ]</button>
          </div>` : ""}
      </div>

      <p class="event-pass-note">${e(badge.note)}${status === "rejected" && payment?.rejectionReason ? ` Reason: ${e(payment.rejectionReason)}` : ""}</p>

      ${status === "rejected" && payment ? `
        <form id="utr-resubmit-form" class="event-reg-form">
          <div class="event-reg-group">
            <label class="event-reg-label" for="resubmit-utr">Correct 12-digit UTR *</label>
            <input type="text" class="event-reg-input event-reg-utr" id="resubmit-utr" inputmode="numeric" maxlength="12" autocomplete="off" />
          </div>
          <div id="resubmit-error" class="event-reg-error" role="alert" hidden></div>
          <button type="submit" class="event-submit-btn">[ RESUBMIT UTR ]</button>
        </form>` : ""}

      <button class="event-submit-btn secondary" id="pass-done-btn">[ BACK TO EVENTS ]</button>
    </div>
  `;

  card.querySelector("#pass-close-btn").onclick = closeEventRegistration;
  card.querySelector("#pass-done-btn").onclick = closeEventRegistration;

  const copyCodeBtn = card.querySelector("#copy-team-code-btn");
  if (copyCodeBtn) {
    copyCodeBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(team.teamCode);
        copyCodeBtn.textContent = "[ COPIED ]";
      } catch {
        copyCodeBtn.textContent = "[ COPY FAILED ]";
      }
      setTimeout(() => (copyCodeBtn.textContent = "[ COPY CODE ]"), 2000);
    };
  }

  const resubmitForm = card.querySelector("#utr-resubmit-form");
  if (resubmitForm) {
    const input = resubmitForm.querySelector("#resubmit-utr");
    input.oninput = () => (input.value = input.value.replace(/\D/g, "").slice(0, 12));
    resubmitForm.onsubmit = async (evt) => {
      evt.preventDefault();
      const errEl = resubmitForm.querySelector("#resubmit-error");
      errEl.hidden = true;
      try {
        if (!UTR_PATTERN.test(input.value)) throw new Error("Enter the 12-digit UTR from your UPI receipt.");
        await resubmitPaymentUtr(payment.paymentId, input.value);
        await renderRegistrationPass(card, ev);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    };
  }
}

export function closeEventRegistration() {
  const modal = document.getElementById("event-reg-modal");
  if (modal) modal.classList.remove("active");
  isRegModalOpen = false;
  activeRegEvent = null;
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
  const events = filterEvents(activeCategory, activeSearchQuery);
  grid.innerHTML = events.length > 0
    ? events.map((ev) => renderEventCardHtml(ev)).join("")
    : `
      <div class="events-empty">
        <h3>No Arenas Found</h3>
        <p>No competitions match your current search or category filter. Try clearing your search.</p>
      </div>
    `;

  // Animate newly mounted cards
  triggerCardsReveal();
}

/**
 * Mount and attach events listeners to the DOM
 */
export function initEventsPage() {
  const root = document.getElementById("chaitanya-events-page");
  if (!root) return;

  const dossierOverlay = document.getElementById("event-dossier-overlay");
  if (dossierOverlay && dossierOverlay.parentElement !== document.body) {
    document.body.appendChild(dossierOverlay);
  }

  const regModal = document.getElementById("event-reg-modal");
  if (regModal && regModal.parentElement !== document.body) {
    document.body.appendChild(regModal);
  }

  const scrollHud = document.getElementById("events-scroll-hud");
  if (scrollHud && scrollHud.parentElement !== document.body) {
    document.body.appendChild(scrollHud);
  }

  const progressBar = document.getElementById("events-scroll-progress");
  if (progressBar && progressBar.parentElement !== document.body) {
    document.body.appendChild(progressBar);
  }

  // Category toolbar clicks
  const catBar = document.getElementById("events-cat-bar");
  if (catBar) {
    catBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".events-cat-btn");
      if (!btn) return;
      const cat = btn.getAttribute("data-cat");
      if (cat) {
        activeCategory = cat;
        catBar.querySelectorAll(".events-cat-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        refreshEventsGrid();
      }
    });
  }

  // Search Box input
  const searchBox = document.getElementById("events-search-box");
  const clearBtn = document.getElementById("events-search-clear-btn");
  if (searchBox) {
    searchBox.addEventListener("input", (e) => {
      activeSearchQuery = e.target.value || "";
      if (clearBtn) {
        if (activeSearchQuery) clearBtn.classList.add("active");
        else clearBtn.classList.remove("active");
      }
      refreshEventsGrid();
    });
  }

  if (clearBtn && searchBox) {
    clearBtn.addEventListener("click", () => {
      searchBox.value = "";
      activeSearchQuery = "";
      clearBtn.classList.remove("active");
      refreshEventsGrid();
    });
  }

  // Delegated clicks on Event Cards
  document.addEventListener("click", (e) => {
    const detailsBtn = e.target.closest('button[data-action="view-details"]');
    if (detailsBtn) {
      const evId = detailsBtn.getAttribute("data-event-id");
      if (evId) openEventDossier(evId);
      return;
    }

    const regBtn = e.target.closest('button[data-action="register-event"]');
    if (regBtn) {
      const evId = regBtn.getAttribute("data-event-id");
      if (evId) openEventRegistration(evId);
      return;
    }
  });

  // Global keydown (Escape closes drawer & modal)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (isRegModalOpen) closeEventRegistration();
      else if (isDossierOpen) closeEventDossier();
    }
  });

  // Click outside closes
  if (dossierOverlay) {
    dossierOverlay.addEventListener("click", (e) => {
      if (e.target === dossierOverlay) closeEventDossier();
    });
  }

  if (regModal) {
    regModal.addEventListener("click", (e) => {
      if (e.target === regModal) closeEventRegistration();
    });
  }

  // Subscribe to auth state so buttons update automatically
  subscribeAuthState(() => {
    refreshEventsGrid();
  });

  // Initialize Scroll Motion UI
  initScrollMotion();
}

// Window global hooks for smooth router integration
if (typeof window !== "undefined") {
  window.openEventDossier = openEventDossier;
  window.openEventRegistration = openEventRegistration;
  window.initEventsPage = initEventsPage;
  window.initScrollMotion = initScrollMotion;
  window.triggerCardsReveal = triggerCardsReveal;
  window.renderEventsPageHtml = renderEventsPageHtml;
}
