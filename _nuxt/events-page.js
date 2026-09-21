/**
 * ============================================================================
 * Chaitanya 2k26 — Events Page Component & Interactive Controller
 * ============================================================================
 * Provides:
 * - Dedicated /events page layout with brutalist hero & sticky toolbar
 * - Real-time category filtering & live search
 * - Interactive Rules & Regulations Dossier Drawer
 * - Solo & Team Registration Modal with University SBI UPI QR & UTR submission
 * - Reactive button state synchronization with Firebase Auth
 */

import {
  getEventCatalog,
  getEventById,
  getCategories,
  filterEvents,
} from "./events-data.js";

import {
  getCurrentUser,
  subscribeAuthState,
  registerSoloForEvent,
  createTeamForEvent,
  joinTeamWithCode,
  isEventRegistered,
  unregisterFromEvent,
} from "./auth-service.js";

import { openAuthModal } from "./auth-modal.js";

let activeCategory = "all";
let activeSearchQuery = "";
let isDossierOpen = false;
let activeDossierEvent = null;
let isRegModalOpen = false;
let activeRegEvent = null;

/**
 * Generate HTML for the complete Events Page
 */
export function renderEventsPageHtml() {
  const categories = getCategories();
  const events = filterEvents(activeCategory, activeSearchQuery);

  const categoriesHtml = categories
    .map(
      (cat) => `
      <button class="events-cat-btn ${activeCategory === cat.id ? "active" : ""}" data-cat="${cat.id}">
        ${cat.name}
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
      <div class="events-container">
        <!-- 1. Hero Section -->
        <header class="events-hero">
          <span class="events-hero-tag">CHAITANYA 2K26 // SCHEDULE & COMPETITIONS</span>
          <h1 class="events-hero-title">ARENAS & SHOWCASE</h1>
          <p class="events-hero-subtitle">
            EXPLORE 12 HIGH-OCTANE COMPETITIONS ACROSS CODING, ROBOTICS, ESPORTS & PERFORMING ARTS.
            REGISTER YOUR SQUAD, CLAIM CASH PRIZES & DOMINATE THE ARENA.
          </p>
          <div class="events-stats-strip">
            <span class="events-stat-pill highlight">[ 12 ARENAS ]</span>
            <span class="events-stat-pill">[ ₹3,00,000+ CASH POOL ]</span>
            <span class="events-stat-pill">[ 2 DAYS // MARCH 26-27 ]</span>
            <span class="events-stat-pill">[ SBI UPI QR // 0% FEE ]</span>
          </div>
        </header>

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
              value="${activeSearchQuery}"
            />
            <button class="events-search-clear ${activeSearchQuery ? "active" : ""}" id="events-search-clear-btn">✕</button>
          </div>
        </div>

        <!-- 3. Event Cards Grid -->
        <div class="events-grid" id="events-card-grid">
          ${eventsHtml}
        </div>
      </div>

      <!-- 4. Interactive Event Dossier Drawer -->
      <div class="event-dossier-overlay" id="event-dossier-overlay">
        <div class="event-dossier-panel" id="event-dossier-panel">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- 5. Registration & Payment Modal -->
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
    <div class="event-card" data-event-id="${ev.id}">
      <span class="corner corner-tl">+</span>
      <span class="corner corner-tr">+</span>
      <span class="corner corner-bl">+</span>
      <span class="corner corner-br">+</span>

      <div class="event-card-header">
        <span class="event-badge-category" style="color:${accentColor}; border-color:${accentColor};">
          ${ev.categoryName}
        </span>
        <span class="event-badge-format">${ev.format}</span>
      </div>

      <h2 class="event-card-title">${ev.title}</h2>
      <p class="event-card-tagline">${ev.tagline}</p>

      <div class="event-card-meta">
        <div class="event-meta-row">
          <span class="event-meta-label">SCHEDULE:</span>
          <span class="event-meta-val">${ev.date} | ${ev.time}</span>
        </div>
        <div class="event-meta-row">
          <span class="event-meta-label">VENUE:</span>
          <span class="event-meta-val">${ev.venue}</span>
        </div>
        <div class="event-meta-row">
          <span class="event-meta-label">PRIZE POOL:</span>
          <span class="event-meta-val prize">${ev.prizePool}</span>
        </div>
        <div class="event-meta-row">
          <span class="event-meta-label">ENTRY FEE:</span>
          <span class="event-meta-val">${ev.entryFee}</span>
        </div>
      </div>

      <div class="event-card-actions">
        <button class="event-btn-details" data-action="view-details" data-event-id="${ev.id}">
          [ VIEW DETAILS ]
        </button>
        <button class="event-btn-register ${isRegistered ? "registered" : ""}" data-action="register-event" data-event-id="${ev.id}">
          ${isRegistered ? "[ ✓ REGISTERED ]" : "[ REGISTER NOW ]"}
        </button>
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

  const rulesHtml = ev.rules.map((r) => `<li>${r}</li>`).join("");

  const roundsHtml = (ev.rounds || [])
    .map(
      (rnd) => `
      <div style="background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:10px 12px; margin-bottom:8px;">
        <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; color:#000;">${rnd.name}</div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:10px; color:#666; margin-bottom:4px;">${rnd.time}</div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:#333;">${rnd.description}</div>
      </div>
    `
    )
    .join("");

  const rubricHtml = (ev.judgingCriteria || [])
    .map(
      (jc) => `
      <div style="display:flex; justify-content:space-between; font-family:'IBM Plex Mono',monospace; font-size:11px; padding:4px 0; border-bottom:1px dashed rgba(0,0,0,0.1);">
        <span>${jc.name}</span>
        <span style="font-weight:700;">${jc.weight}</span>
      </div>
    `
    )
    .join("");

  const coordinatorsHtml = (ev.coordinators || [])
    .map(
      (c) => `
      <div class="event-coordinator-card">
        <div class="event-coord-info">
          <span class="event-coord-name">${c.name}</span>
          <span class="event-coord-role">${c.role}</span>
        </div>
        <div class="event-coord-actions">
          <a href="tel:${c.phone}" class="event-coord-btn">📞 CALL</a>
          ${c.whatsapp ? `<a href="${c.whatsapp}" target="_blank" class="event-coord-btn" style="background:#25D366; color:#fff; border-color:#25D366;">💬 WHATSAPP</a>` : ""}
        </div>
      </div>
    `
    )
    .join("");

  panel.innerHTML = `
    <button class="event-dossier-close" id="dossier-close-btn">[ ESC / CLOSE ]</button>
    
    <div>
      <span class="event-dossier-badge" style="color:${accentColor}; border-color:${accentColor};">
        ${ev.categoryName} // ${ev.badge}
      </span>
      <h2 class="event-dossier-title">${ev.title}</h2>
      <p class="event-dossier-tagline">${ev.tagline}</p>
    </div>

    <!-- Key Specs -->
    <div class="event-dossier-specs">
      <div class="event-spec-item">
        <span class="event-spec-k">PRIZE POOL</span>
        <span class="event-spec-v" style="color:#005a3c; font-weight:700;">${ev.prizePool}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">ENTRY FEE</span>
        <span class="event-spec-v">${ev.entryFee}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">SCHEDULE</span>
        <span class="event-spec-v">${ev.date} | ${ev.time}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">VENUE</span>
        <span class="event-spec-v">${ev.venue}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">TEAM FORMAT</span>
        <span class="event-spec-v">${ev.format}</span>
      </div>
      <div class="event-spec-item">
        <span class="event-spec-k">STATUS</span>
        <span class="event-spec-v" style="color:#005a3c;">${ev.status}</span>
      </div>
    </div>

    <!-- Section: Overview -->
    <div class="event-dossier-section">
      <h4 class="event-dossier-heading">[ 01. OVERVIEW & OBJECTIVE ]</h4>
      <p class="event-dossier-text">${ev.overview}</p>
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
      <h4 class="event-dossier-heading">[ 05. EVENT COORDINATORS & CONTACT ]</h4>
      <div>${coordinatorsHtml}</div>
    </div>

    <!-- Direct CTA -->
    <button class="event-submit-btn" id="dossier-action-btn" data-event-id="${ev.id}" style="width:100%; margin-top:20px;">
      ${isRegistered ? "[ ✓ ALREADY REGISTERED // VIEW TICKET ]" : `[ REGISTER FOR ${ev.title} ]`}
    </button>
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

  // If not logged in, prompt Google Sign-In with event pre-selected
  if (!user) {
    openAuthModal("register", { pendingEvent: ev.title });
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

  card.innerHTML = `
    <button class="event-reg-close" id="reg-modal-close-btn">[ ESC / CLOSE ]</button>
    <div style="text-align:center; margin-bottom:16px;">
      <span style="font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:700; color:#005a3c; text-transform:uppercase;">
        CHAITANYA 2K26 // EVENT ENROLLMENT
      </span>
      <h3 style="font-family:'DrukMedium',sans-serif; font-size:32px; margin:4px 0 6px; text-transform:uppercase;">
        ${ev.title}
      </h3>
      <p style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:#555;">
        ${isTeam ? `Format: ${ev.format} | Max ${ev.maxTeam} Members` : "Individual Solo Registration"}
      </p>
    </div>

    <form class="event-reg-form" id="event-reg-form" novalidate>
      ${isTeam ? `
        <div class="event-reg-group">
          <label class="event-reg-label">Registration Mode</label>
          <div style="display:flex; gap:10px;">
            <label style="font-family:'IBM Plex Mono',monospace; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px;">
              <input type="radio" name="team_mode" value="create" checked /> Create New Team
            </label>
            <label style="font-family:'IBM Plex Mono',monospace; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px;">
              <input type="radio" name="team_mode" value="join" /> Join with Team Code
            </label>
          </div>
        </div>

        <div id="create-team-fields">
          <div class="event-reg-group">
            <label class="event-reg-label">Team Name *</label>
            <input type="text" class="event-reg-input" id="reg-team-name" placeholder="e.g. ByteBusters" required />
          </div>
          <div class="event-reg-group" style="margin-top:10px;">
            <label class="event-reg-label">Team Leader WhatsApp / Phone *</label>
            <input type="tel" class="event-reg-input" id="reg-leader-phone" value="${user.phone || ""}" placeholder="+91 98160 XXXXX" required />
          </div>
          <div class="event-reg-group" style="margin-top:10px;">
            <label class="event-reg-label">College / Institute *</label>
            <input type="text" class="event-reg-input" id="reg-college" value="${user.college || ""}" placeholder="e.g. HPTU Hamirpur" required />
          </div>
        </div>

        <div id="join-team-fields" style="display:none;">
          <div class="event-reg-group">
            <label class="event-reg-label">Enter 6-Digit Team Code *</label>
            <input type="text" class="event-reg-input" id="reg-team-code" placeholder="e.g. BYTE-408" style="text-transform:uppercase; letter-spacing:1.5px; font-weight:700;" />
            <span style="font-family:'IBM Plex Mono',monospace; font-size:10px; color:#777; margin-top:4px;">
              Ask your team leader for the unique team code generated upon team creation.
            </span>
          </div>
        </div>
      ` : `
        <div class="event-reg-group">
          <label class="event-reg-label">Participant Name</label>
          <input type="text" class="event-reg-input" value="${user.displayName || ""}" readonly style="background:#f9f9f9;" />
        </div>
        <div class="event-reg-group">
          <label class="event-reg-label">WhatsApp Contact Number *</label>
          <input type="tel" class="event-reg-input" id="reg-solo-phone" value="${user.phone || ""}" placeholder="+91 98160 XXXXX" required />
        </div>
        <div class="event-reg-group">
          <label class="event-reg-label">College / Institute *</label>
          <input type="text" class="event-reg-input" id="reg-solo-college" value="${user.college || ""}" placeholder="e.g. HPTU Hamirpur" required />
        </div>
      `}

      <!-- Payment Section -->
      ${ev.entryFeeNum > 0 ? `
        <div class="event-upi-payment-box">
          <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; color:#000;">
            ENTRY FEE DUE: ₹${ev.entryFeeNum}
          </div>
          <div class="event-qr-display">
            <!-- Simulated High-Res SBI UPI QR Code -->
            <img src="/images/icons/Logo.svg" alt="SBI UPI QR Code" style="filter:none;" />
          </div>
          <div class="event-upi-id-copy">
            <span>UPI ID: <strong>chaitanyahptu@sbi</strong></span>
            <button type="button" class="event-upi-copy-btn" id="copy-upi-btn">[ COPY ]</button>
          </div>
          <p style="font-family:'IBM Plex Mono',monospace; font-size:10px; color:#555; line-height:1.4;">
            Scan via GPay, PhonePe or Paytm. Submit the 12-digit UPI UTR reference number below for instant verification.
          </p>
          <div class="event-reg-group" style="width:100%; text-align:left;">
            <label class="event-reg-label">12-Digit UPI Transaction / UTR Number *</label>
            <input 
              type="text" 
              class="event-reg-input" 
              id="reg-utr-number" 
              placeholder="e.g. 408192837192" 
              maxlength="16" 
              required 
              style="letter-spacing:1px; font-weight:600;"
            />
          </div>
        </div>
      ` : `
        <div style="background:#eafaf1; border:1.5px solid #2ecc71; border-radius:12px; padding:12px; text-align:center;">
          <span style="font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; color:#27ae60;">
            ✓ FREE REGISTRATION FOR CHAITANYA 2K26 ATTENDEES
          </span>
        </div>
      `}

      <div id="reg-error-msg" style="color:red; font-family:'IBM Plex Mono',monospace; font-size:11px; display:none;"></div>

      <button type="submit" class="event-submit-btn" id="reg-submit-btn">
        [ COMPLETE REGISTRATION & CONFIRM ]
      </button>
    </form>
  `;

  modal.classList.add("active");
  isRegModalOpen = true;

  // Bind close
  const closeBtn = card.querySelector("#reg-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeEventRegistration;

  // Bind Team Mode toggle
  const createFields = card.querySelector("#create-team-fields");
  const joinFields = card.querySelector("#join-team-fields");
  const teamRadios = card.querySelectorAll('input[name="team_mode"]');
  teamRadios.forEach((r) => {
    r.onchange = () => {
      if (r.value === "join") {
        if (createFields) createFields.style.display = "none";
        if (joinFields) joinFields.style.display = "block";
      } else {
        if (createFields) createFields.style.display = "block";
        if (joinFields) joinFields.style.display = "none";
      }
    };
  });

  // Bind Copy UPI ID
  const copyBtn = card.querySelector("#copy-upi-btn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText("chaitanyahptu@sbi");
      copyBtn.textContent = "[ COPIED! ]";
      setTimeout(() => (copyBtn.textContent = "[ COPY ]"), 2000);
    };
  }

  // Handle Form Submit
  const form = card.querySelector("#event-reg-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = card.querySelector("#reg-submit-btn");
      const errBox = card.querySelector("#reg-error-msg");
      if (errBox) errBox.style.display = "none";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "[ PROCESSING ENROLLMENT... ]";
      }

      try {
        const utr = (card.querySelector("#reg-utr-number")?.value || "").trim();
        const isJoinMode = card.querySelector('input[name="team_mode"]:checked')?.value === "join";

        if (isTeam && isJoinMode) {
          const teamCode = (card.querySelector("#reg-team-code")?.value || "").trim();
          if (!teamCode) throw new Error("Please enter your team code.");
          await joinTeamWithCode(teamCode);
        } else if (isTeam) {
          const teamName = (card.querySelector("#reg-team-name")?.value || "").trim();
          const leaderPhone = (card.querySelector("#reg-leader-phone")?.value || "").trim();
          const college = (card.querySelector("#reg-college")?.value || "").trim();
          if (!teamName) throw new Error("Please enter your team name.");
          if (!leaderPhone) throw new Error("Please enter team leader phone number.");
          if (ev.entryFeeNum > 0 && !utr) throw new Error("Please provide your 12-digit UPI UTR number.");
          await createTeamForEvent(ev, { teamName, leaderPhone, college }, { utr });
        } else {
          const phone = (card.querySelector("#reg-solo-phone")?.value || "").trim();
          const college = (card.querySelector("#reg-solo-college")?.value || "").trim();
          if (!phone) throw new Error("Please enter contact phone number.");
          if (ev.entryFeeNum > 0 && !utr) throw new Error("Please provide your 12-digit UPI UTR number.");
          user.phone = phone;
          user.college = college;
          await registerSoloForEvent(ev, { utr, phone });
        }

        // Show Success Pass Card
        renderRegistrationPass(card, ev);
        refreshEventsGrid();
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || "Failed to complete registration.";
          errBox.style.display = "block";
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "[ COMPLETE REGISTRATION & CONFIRM ]";
        }
      }
    };
  }
}

function renderRegistrationPass(card, ev) {
  card.innerHTML = `
    <button class="event-reg-close" id="pass-close-btn">[ ESC / CLOSE ]</button>
    <div style="text-align:center; padding:10px 0;">
      <span style="font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; color:#005a3c; background:#eafaf1; padding:4px 12px; border-radius:20px;">
        ✓ REGISTRATION CONFIRMED
      </span>
      <h3 style="font-family:'DrukMedium',sans-serif; font-size:36px; margin:12px 0 6px; text-transform:uppercase;">
        ${ev.title}
      </h3>
      <p style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:#666; margin-bottom:18px;">
        CHAITANYA 2K26 OFFICIAL ENTRY PASS
      </p>

      <div style="background:#ffffff; border:2px dashed #000000; border-radius:16px; padding:20px; text-align:center; margin-bottom:20px;">
        <div style="font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; color:#000; margin-bottom:4px;">
          VENUE: ${ev.venue}
        </div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; color:#555; margin-bottom:12px;">
          DATE & TIME: ${ev.date} // ${ev.time}
        </div>
        <div style="width:120px; height:120px; margin:0 auto 12px; border:1px solid #000; padding:6px; border-radius:8px;">
          <img src="/images/icons/Logo.svg" alt="Pass QR Code" style="width:100%; height:100%; object-fit:contain;" />
        </div>
        <span style="font-family:'IBM Plex Mono',monospace; font-size:10px; color:#888; letter-spacing:1px;">
          PASS ID: CH26-${ev.id.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}
        </span>
      </div>

      <button class="event-submit-btn" id="pass-done-btn" style="width:100%;">
        [ RETURN TO ARENAS ]
      </button>
    </div>
  `;

  const closeBtn = card.querySelector("#pass-close-btn");
  if (closeBtn) closeBtn.onclick = closeEventRegistration;
  const doneBtn = card.querySelector("#pass-done-btn");
  if (doneBtn) doneBtn.onclick = closeEventRegistration;
}

export function closeEventRegistration() {
  const modal = document.getElementById("event-reg-modal");
  if (modal) modal.classList.remove("active");
  isRegModalOpen = false;
  activeRegEvent = null;
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
  root.addEventListener("click", (e) => {
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
}

// Window global hooks for smooth router integration
if (typeof window !== "undefined") {
  window.openEventDossier = openEventDossier;
  window.openEventRegistration = openEventRegistration;
  window.initEventsPage = initEventsPage;
  window.renderEventsPageHtml = renderEventsPageHtml;
}
