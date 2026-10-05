/**
 * ============================================================================
 * Chaitanya 2k26 — Auth Modal Controller (Login, Register, Profile, Admin)
 * ============================================================================
 */

import {
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
  YEAR_OPTIONS,
  getRegisteredAttendees,
  subscribeAuthState,
  getAllTeams,
  getAllPayments,
  getAllRegistrations,
  paymentItems,
  approvePayment,
  rejectPayment,
} from "./auth-service.js";
import { isFirebaseConfigured, isAdminUser } from "./firebase-config.js";
import { applySchemaToFirestore } from "./firebase-schema-seeder.js";
import { getEventById } from "./events-data.js";
import { FEST_CONFIG, escapeHtml as e } from "./fest-config.js";
import { openProfilePanel } from "./profile-panel.js";

const DEMO_BANNER = `
  <div class="chaitanya-modal-banner">
    <span>⚡</span>
    <div><strong>Demo mode:</strong> Firebase is not configured, so data is stored only in this browser.</div>
  </div>
`;

// Google G SVG logo
const GOOGLE_ICON_SVG = `
<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
</svg>
`;

let modalBackdrop = null;
let currentMode = "login"; // "login" | "register" | "profile" | "admin"

/**
 * Initialize DOM nodes and attach global listeners
 */
export function initAuthModal() {
  if (typeof document === "undefined") return;

  const existingBackdrop = document.getElementById("chaitanya-auth-backdrop");
  if (existingBackdrop) {
    modalBackdrop = existingBackdrop;
    return;
  }

  if (!modalBackdrop) {
    modalBackdrop = document.createElement("div");
    modalBackdrop.className = "chaitanya-modal-backdrop";
    modalBackdrop.id = "chaitanya-auth-backdrop";
    modalBackdrop.innerHTML = `
      <div class="chaitanya-modal-card" id="chaitanya-modal-content">
        <span class="corner corner-tl">+</span>
        <span class="corner corner-tr">+</span>
        <span class="corner corner-bl">+</span>
        <span class="corner corner-br">+</span>
        <button class="chaitanya-modal-close" id="chaitanya-modal-close-btn">[ ESC / CLOSE ]</button>
        <div id="chaitanya-modal-body"></div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    // Close listeners
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) {
        closeAuthModal();
      }
    });

    const closeBtn = modalBackdrop.querySelector("#chaitanya-modal-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeAuthModal());
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalBackdrop.classList.contains("active")) {
        e.preventDefault(); // tells other Escape handlers this press was used
        closeAuthModal();
      }
    });

    // Delegated click handler for navbar and any in-page auth buttons
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");

      if (href === "#login") {
        e.preventDefault();
        openAuthModal("login");
      } else if (href === "#register") {
        e.preventDefault();
        openAuthModal("register");
      } else if (href === "#admin") {
        e.preventDefault();
        openAuthModal("admin");
      } else if (href === "#profile") {
        e.preventDefault();
        openAuthModal("profile");
      } else if (href === "#logout") {
        e.preventDefault();
        signOutUser();
      }
    });

    // Listen to hash and route changes (#login, #register, #admin, /login, /register, /admin)
    window.addEventListener("hashchange", checkUrlRoute);
    window.addEventListener("popstate", checkUrlRoute);
    checkUrlRoute();

    // Subscribe to auth changes to keep navbar updated
    subscribeAuthState(syncNavbarAuthState);
  }
}

export function syncNavbarAuthState(user) {
  if (typeof document === "undefined") return;
  // Nav labels/avatars are rendered by the header component; here we only
  // reveal admin links for admins (hidden by CSS otherwise).
  document.documentElement.classList.toggle("is-fest-admin", Boolean(user && isAdminUser(user.email)));
}

function checkUrlRoute() {
  const hash = window.location.hash;
  const path = window.location.pathname.replace(/\/$/, "");
  if (hash === "#login" || path === "/login") {
    openAuthModal("login");
  } else if (hash === "#register" || path === "/register") {
    openAuthModal("register");
  } else if (hash === "#admin" || path === "/admin") {
    openAuthModal("admin");
  } else if (hash === "#profile" || path === "/profile") {
    openAuthModal("profile");
  }
}

/**
 * Open modal in specific mode
 */
export function openAuthModal(mode = "login", options = {}) {
  // The profile lives in its own floating overlay (no page navigation).
  if (mode === "profile" && getCurrentUser()) {
    closeAuthModal();
    openProfilePanel(options.section || "profile");
    return;
  }
  initAuthModal();
  currentMode = mode;
  if (typeof window !== "undefined") {
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
  }

  // Remove any duplicate backdrop elements in DOM to ensure single source of truth
  const backdrops = document.querySelectorAll("#chaitanya-auth-backdrop");
  if (backdrops.length > 1) {
    for (let i = 1; i < backdrops.length; i++) {
      backdrops[i].remove();
    }
  }
  if (!modalBackdrop || !document.body.contains(modalBackdrop)) {
    modalBackdrop = document.getElementById("chaitanya-auth-backdrop");
  }

  const card = modalBackdrop?.querySelector("#chaitanya-modal-content");
  if (card) {
    if (mode === "admin") {
      card.classList.add("admin-wide");
    } else {
      card.classList.remove("admin-wide");
    }
  }

  renderModalContent();
  if (modalBackdrop) modalBackdrop.classList.add("active");
}

/**
 * Close modal
 */
export function closeAuthModal() {
  if (modalBackdrop) {
    modalBackdrop.classList.remove("active");
    // Clear hash if it matches modal trigger
    if (
      window.location.hash === "#login" ||
      window.location.hash === "#register" ||
      window.location.hash === "#admin"
    ) {
      history.pushState(
        "",
        document.title,
        window.location.pathname + window.location.search,
      );
    }
  }
}

/**
 * Render modal contents based on currentMode
 */
async function renderModalContent() {
  const body = modalBackdrop?.querySelector("#chaitanya-modal-body") || document.getElementById("chaitanya-modal-body");
  if (!body) return;

  const user = getCurrentUser();
  const isConfigured = isFirebaseConfigured();


  if (currentMode === "admin") {
    await renderAdminView(body, user);
    return;
  }

  if (currentMode === "register") {
    renderRegisterView(body, isConfigured);
    return;
  }

  // Default: Login mode
  renderLoginView(body, isConfigured);
}

/**
 * 1. Login View
 */
function renderLoginView(container, isConfigured) {
  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Portal ]</div>
      <h2 class="chaitanya-modal-title">Sign In</h2>
      <p class="chaitanya-modal-subtitle">Sign in with Google to register for events and view your entry passes.</p>
    </div>

    ${isConfigured ? "" : DEMO_BANNER}

    <div id="auth-error-box" hidden class="chaitanya-modal-banner warning" role="alert"></div>

    <button type="button" class="btn-google-auth" id="btn-do-google-login">
      ${GOOGLE_ICON_SVG}
      <span>[ Continue with Google ]</span>
    </button>

    <div class="chaitanya-divider"><span>New here?</span></div>

    <div class="chaitanya-modal-footer">
      First time? Signing in creates your account.
      <button type="button" class="chaitanya-link-btn" id="btn-switch-to-register">[ Add college & phone ]</button>
    </div>
  `;

  const btnLogin = container.querySelector("#btn-do-google-login");
  btnLogin.addEventListener("click", async () => {
    setBusy(btnLogin, true, "Connecting to Google...");
    try {
      await signInWithGoogle();
      closeAuthModal();
    } catch (err) {
      showAuthError(err.message || "Google sign-in failed.");
      setBusy(btnLogin, false, `${GOOGLE_ICON_SVG}<span>[ Continue with Google ]</span>`);
    }
  });

  container.querySelector("#btn-switch-to-register").addEventListener("click", () => openAuthModal("register"));
}

/**
 * 2. Register View
 */
function renderRegisterView(container, isConfigured) {
  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Create Account ]</div>
      <h2 class="chaitanya-modal-title">Register</h2>
      <p class="chaitanya-modal-subtitle">Create your fest account, then pick events on the Events page.</p>
    </div>

    ${isConfigured ? "" : DEMO_BANNER}

    <div id="auth-error-box" hidden class="chaitanya-modal-banner warning" role="alert"></div>

    <form id="attendee-register-form" novalidate>
      <div class="chaitanya-form-group">
        <label class="chaitanya-form-label" for="reg-college">College / University *</label>
        <input type="text" id="reg-college" class="chaitanya-form-input" maxlength="120" autocomplete="organization" placeholder="e.g. HPTU Hamirpur" />
      </div>

      <div class="chaitanya-form-group">
        <label class="chaitanya-form-label" for="reg-year">Year *</label>
        <select id="reg-year" class="chaitanya-form-input">
          <option value="">Select year</option>
          ${YEAR_OPTIONS.map((y) => `<option>${e(y)}</option>`).join("")}
        </select>
      </div>

      <div class="chaitanya-form-group">
        <label class="chaitanya-form-label" for="reg-phone">Contact No (WhatsApp) *</label>
        <input type="tel" id="reg-phone" class="chaitanya-form-input" maxlength="20" autocomplete="tel" placeholder="+91 9XXXX XXXXX" />
      </div>

      <div class="chaitanya-divider"><span>Verify with Google</span></div>

      <button type="submit" class="btn-google-auth" id="btn-do-google-register">
        ${GOOGLE_ICON_SVG}
        <span>[ Register with Google ]</span>
      </button>
    </form>

    <div class="chaitanya-modal-footer">
      Already registered?
      <button type="button" class="chaitanya-link-btn" id="btn-switch-to-login">[ Sign In ]</button>
    </div>
  `;

  const form = container.querySelector("#attendee-register-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const college = container.querySelector("#reg-college").value.trim();
    const phone = container.querySelector("#reg-phone").value.trim();
    const year = container.querySelector("#reg-year").value;
    if (!college) return showAuthError("Please enter your college / university.");
    if (!year) return showAuthError("Please select your year.");
    if (phone.replace(/\D/g, "").length < 10) return showAuthError("Please enter a valid contact number.");

    const btn = container.querySelector("#btn-do-google-register");
    setBusy(btn, true, "Registering via Google...");
    try {
      await signInWithGoogle({ college, phone, year });
      closeAuthModal();
    } catch (err) {
      showAuthError(err.message || "Registration failed.");
      setBusy(btn, false, `${GOOGLE_ICON_SVG}<span>[ Register with Google ]</span>`);
    }
  });

  container.querySelector("#btn-switch-to-login").addEventListener("click", () => openAuthModal("login"));
}

/**
 * 4. Admin Dashboard
 */
async function renderAdminView(container, user) {
  const card = document.getElementById("chaitanya-modal-content");

  if (!user) {
    if (card) card.classList.remove("admin-wide");
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ Admin ]</div>
        <h2 class="chaitanya-modal-title">Admin Access</h2>
        <p class="chaitanya-modal-subtitle">Sign in with an authorised fest administrator Google account.</p>
      </div>
      <div id="auth-error-box" hidden class="chaitanya-modal-banner warning" role="alert"></div>
      <button type="button" class="btn-google-auth" id="btn-admin-signin">
        ${GOOGLE_ICON_SVG}<span>[ Sign In with Google ]</span>
      </button>
    `;
    container.querySelector("#btn-admin-signin").addEventListener("click", async () => {
      try {
        await signInWithGoogle();
        renderAdminView(container, getCurrentUser());
      } catch (err) {
        showAuthError(err.message);
      }
    });
    return;
  }

  if (!isAdminUser(user.email)) {
    if (card) card.classList.remove("admin-wide");
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ 403 • Access Restricted ]</div>
        <h2 class="chaitanya-modal-title">Access Denied</h2>
        <p class="chaitanya-modal-subtitle">${e(user.email)} is not a fest administrator account.</p>
      </div>
      <button type="button" class="btn-secondary-action" id="btn-denied-return-profile">[ Back to My Profile ]</button>
    `;
    container.querySelector("#btn-denied-return-profile").addEventListener("click", () => openAuthModal("profile"));
    return;
  }

  if (card) card.classList.add("admin-wide");
  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Admin ]</div>
      <h2 class="chaitanya-modal-title">Fest Command Center</h2>
    </div>
    <div class="admin-loading">Loading fest database...</div>
  `;

  const state = {
    tab: "payments",
    attendees: [],
    teams: [],
    payments: [],
    registrations: [],
    errors: [],
    devServer: false,
  };

  const results = await Promise.allSettled([
    getRegisteredAttendees(),
    getAllTeams(),
    getAllPayments(),
    getAllRegistrations(),
  ]);
  ["attendees", "teams", "payments", "registrations"].forEach((key, idx) => {
    const r = results[idx];
    if (r.status === "fulfilled") state[key] = r.value || [];
    else state.errors.push(`${key}: ${r.reason?.message || r.reason}`);
  });

  // The Redis tab only makes sense on the local Python dev server.
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    state.devServer = res.ok && (res.headers.get("content-type") || "").includes("json");
  } catch {}

  renderAdminShell(container, user, state);
}

function eventFee(eventId) {
  const ev = getEventById(eventId);
  return ev ? Number(ev.entryFeeNum) || 0 : 0;
}

function computeAdminData(state) {
  const paymentsById = new Map(state.payments.map((p) => [p.paymentId, p]));
  const utrCounts = new Map();
  state.payments.forEach((p) => {
    if (p.transactionRef) utrCounts.set(p.transactionRef, (utrCounts.get(p.transactionRef) || 0) + 1);
  });
  const teamsById = new Map(state.teams.map((t) => [t.teamId, t]));

  // A registration is valid if: free event, verified payment, or member of a
  // team whose leader's payment is verified.
  const regRows = state.registrations.map((r) => {
    const fee = eventFee(r.event_id);
    let payStatus;
    if (r.participation_type === "team" && r.team_role === "member") {
      const team = teamsById.get(r.team_id);
      const leaderPay = team?.paymentId ? paymentsById.get(team.paymentId) : null;
      payStatus = fee === 0 ? "free" : leaderPay?.status || "unpaid";
    } else if (fee === 0) {
      payStatus = "free";
    } else {
      payStatus = paymentsById.get(r.payment_id)?.status || "unpaid";
    }
    return { ...r, fee, payStatus };
  });

  const leaderContact = new Map(
    state.registrations
      .filter((r) => r.team_role === "leader")
      .map((r) => [r.team_id, { email: r.user_email, phone: r.user_phone }])
  );

  return { utrCounts, regRows, leaderContact };
}

const STATUS_LABEL = {
  pending_verification: "PENDING",
  verified: "VERIFIED",
  rejected: "REJECTED",
  free: "FREE",
  team: "TEAM",
  unpaid: "UNPAID",
  paid: "PAID",
  pending: "PENDING",
};

function statusBadge(status, id = "") {
  const s = status || "pending_verification";
  const cls = s.includes("pending") ? "pending" : s === "unpaid" ? "rejected" : s;
  return `<span class="badge-status ${e(cls)}"${id ? ` id="${e(id)}"` : ""}>${e(STATUS_LABEL[s] || s.toUpperCase())}</span>`;
}

function renderAdminTab(state) {
  const { utrCounts, regRows, leaderContact } = computeAdminData(state);
  const pending = state.payments.filter((p) => p.status === "pending_verification");
  const unpaid = regRows.filter((r) => r.payStatus === "unpaid" || r.payStatus === "rejected");
  let stats = "";
  let table = "";

  const statCard = (num, label, alert = false) => `
    <div class="admin-stat-card">
      <div class="admin-stat-num"${alert ? ' style="color:#b30000"' : ""}>${e(num)}</div>
      <div class="admin-stat-label">${e(label)}</div>
    </div>`;

  if (state.tab === "payments") {
    const verifiedTotal = state.payments
      .filter((p) => p.status === "verified")
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    stats = `<div class="admin-stats-grid">
      ${statCard(`₹${verifiedTotal.toLocaleString("en-IN")}`, "Verified collections")}
      ${statCard(pending.length, "Pending verification", pending.length > 0)}
      ${statCard(state.payments.length, "Total submissions")}
    </div>`;

    const sorted = [...state.payments].sort((a, b) => {
      const pa = a.status === "pending_verification" ? 0 : 1;
      const pb = b.status === "pending_verification" ? 0 : 1;
      return pa - pb || String(b.createdAt).localeCompare(String(a.createdAt));
    });

    const rows = sorted.map((p) => {
      const isPending = p.status === "pending_verification";
      const dup = utrCounts.get(p.transactionRef) > 1;
      const items = paymentItems(p);
      const expected = items.reduce((sum, it) => sum + eventFee(it.eventId), 0);
      const wrongAmount = expected > 0 && Number(p.amount) !== expected;
      const flags = [
        dup ? `<span class="admin-flag">DUPLICATE UTR</span>` : "",
        wrongAmount ? `<span class="admin-flag">FEE IS ₹${e(expected)}</span>` : "",
      ].join("");
      return `
        <tr>
          <td>${items.map((it) => `<strong>${e(it.eventTitle || it.eventId)}</strong>${it.teamName ? ` <small>· Team ${e(it.teamName)}</small>` : ""}`).join("<br/>")}</td>
          <td>${e(p.payerName)}<br/><small>${e(p.payerEmail)} · ${e(p.payerPhone)}</small></td>
          <td><strong>₹${e(p.amount)}</strong></td>
          <td><code>${e(p.transactionRef || "—")}</code>${flags}</td>
          <td>${e(formatDate(p.createdAt))}</td>
          <td>${statusBadge(p.status)}</td>
          <td>
            ${isPending ? `
              <div class="admin-action-btn-group">
                <button type="button" class="btn-action-approve" data-id="${e(p.paymentId)}">✓ Approve</button>
                <button type="button" class="btn-action-reject" data-id="${e(p.paymentId)}">✕ Reject</button>
              </div>` : `<small>${e(p.status === "verified" ? `By ${(p.verifiedBy || "").split("@")[0]}` : p.rejectionReason || "")}</small>`}
          </td>
        </tr>`;
    }).join("");

    table = adminTable(
      ["Events", "Payer", "Amount", "UTR", "Submitted", "Status", "Action"],
      rows,
      "No payment submissions yet",
      `Match each UTR against the bank statement for ${e(FEST_CONFIG.upiId || "the fest UPI account")} before approving.`
    );
  } else if (state.tab === "registrations") {
    stats = `<div class="admin-stats-grid">
      ${statCard(regRows.length, "Registrations")}
      ${statCard(new Set(regRows.map((r) => r.event_id)).size, "Events with entries")}
      ${statCard(unpaid.length, "Unpaid / rejected", unpaid.length > 0)}
    </div>`;

    const rows = [...regRows]
      .sort((a, b) => String(a.event_title).localeCompare(String(b.event_title)))
      .map((r) => `
        <tr>
          <td><strong>${e(r.event_title)}</strong></td>
          <td>${e(r.user_name)}<br/><small>${e(r.user_email)}</small></td>
          <td>${e(r.user_phone)}</td>
          <td>${e(r.user_college)}</td>
          <td>${r.participation_type === "team" ? `${e(r.team_role || "team")} · <code>${e(r.team_code)}</code>` : "Solo"}</td>
          <td><code>${e(r.registration_qr_id)}</code></td>
          <td>${statusBadge(r.payStatus)}</td>
        </tr>`)
      .join("");

    table = adminTable(
      ["Event", "Participant", "Phone", "College", "Type", "Pass ID", "Payment"],
      rows,
      "No registrations yet",
      "UNPAID means a paid event has no verified payment for this entry. Do not admit until it is verified."
    );
  } else if (state.tab === "teams") {
    stats = `<div class="admin-stats-grid">
      ${statCard(state.teams.length, "Teams")}
      ${statCard(state.teams.reduce((acc, t) => acc + (t.teamSize || 1), 0), "Team members")}
      ${statCard(state.teams.filter((t) => (t.teamSize || 1) < (t.minTeamSize || 1)).length, "Below minimum size")}
    </div>`;

    const rows = state.teams.map((t) => {
      const contact = leaderContact.get(t.teamId) || {};
      const members = (t.members || []).map((m) => e(m.name)).join(", ");
      const small = (t.teamSize || 1) < (t.minTeamSize || 1);
      return `
        <tr>
          <td><strong>${e(t.teamName)}</strong><br/><small>${members}</small></td>
          <td><code>${e(t.teamCode)}</code></td>
          <td>${e(t.eventName)}</td>
          <td>${e(t.leaderName)}<br/><small>${e(contact.email || "")} · ${e(contact.phone || "")}</small></td>
          <td>${e(t.teamSize || 1)} / ${e(t.maxTeamSize || "?")}${small ? `<span class="admin-flag">MIN ${e(t.minTeamSize)}</span>` : ""}</td>
          <td>${statusBadge(t.paymentStatus || "free")}</td>
        </tr>`;
    }).join("");

    table = adminTable(["Team", "Code", "Event", "Leader", "Size", "Payment"], rows, "No teams yet");
  } else if (state.tab === "attendees") {
    stats = `<div class="admin-stats-grid">
      ${statCard(state.attendees.length, "Accounts")}
      ${statCard(new Set(state.attendees.map((a) => (a.college || "").toLowerCase()).filter(Boolean)).size, "Colleges")}
      ${statCard(state.attendees.filter((a) => (a.registeredEventIds || a.registeredEvents || []).length).length, "With registrations")}
    </div>`;

    const rows = state.attendees.map((a) => `
      <tr>
        <td><strong>${e(a.displayName || a.name || "—")}</strong></td>
        <td>${e(a.email)}</td>
        <td>${e(a.college)}</td>
        <td>${e(a.year)}</td>
        <td>${e(a.phone)}</td>
        <td><code>${e(a.studentId)}</code></td>
        <td>${e((a.registeredEvents || []).join(", "))}</td>
      </tr>`).join("");

    table = adminTable(["Name", "Email", "College", "Year", "Phone", "ID", "Events"], rows, "No accounts yet");
  } else if (state.tab === "setup") {
    table = `
      <div class="admin-panel-box">
        <h4>Sync event catalog to Firestore</h4>
        <p>Writes the event catalog (with entry fees) to the <code>events</code> collection. The security rules use these
        fees to stop paid events being registered as free. Run it again after editing <code>_nuxt/events-data.js</code>.</p>
        <button type="button" class="btn-google-auth admin-inline-btn" id="btn-run-schema-seed">
          <span>[ Sync events & FAQs to Firestore ]</span>
        </button>
        <div id="schema-sync-progress" class="admin-progress" hidden></div>
      </div>`;
  } else if (state.tab === "redis") {
    table = `
      <div class="admin-panel-box">
        <h4>Local dev server cache</h4>
        <p id="redis-stat-meta">Loading /api/cache/stats...</p>
        <div class="admin-action-btn-group">
          <button type="button" class="btn-action-view" id="btn-refresh-redis">Refresh</button>
          <button type="button" class="btn-action-reject" id="btn-purge-redis">Purge cache</button>
        </div>
      </div>`;
  }

  const tabs = [
    ["payments", `Payments (${pending.length} pending)`],
    ["registrations", `Registrations (${regRows.length})`],
    ["teams", `Teams (${state.teams.length})`],
    ["attendees", `Accounts (${state.attendees.length})`],
    ["setup", "Setup"],
    ...(state.devServer ? [["redis", "Dev cache"]] : []),
  ];

  return `
    <div class="admin-tabs-nav" role="tablist">
      ${tabs.map(([id, label], i) => `
        <button type="button" role="tab" aria-selected="${state.tab === id}" class="admin-tab-btn ${state.tab === id ? "active" : ""}" data-tab="${id}">
          [ ${String(i + 1).padStart(2, "0")}. ${e(label.toUpperCase())} ]
        </button>`).join("")}
    </div>
    ${state.errors.length ? `<div class="chaitanya-modal-banner danger" role="alert"><div><strong>Some data failed to load:</strong> ${e(state.errors.join(" · "))}</div></div>` : ""}
    ${stats}
    ${table}
  `;
}

function adminTable(headers, rows, emptyText, note = "") {
  return `
    ${note ? `<p class="admin-note">${note}</p>` : ""}
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${headers.length}" style="text-align:center;">${e(emptyText)}</td></tr>`}</tbody>
      </table>
    </div>`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function renderAdminShell(container, user, state) {
  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Admin ]</div>
      <h2 class="chaitanya-modal-title">Fest Command Center</h2>
      <p class="chaitanya-modal-subtitle">Signed in as ${e(user.email)}</p>
    </div>

    <div id="admin-tab-container">${renderAdminTab(state)}</div>

    <div class="admin-export-bar">
      <div class="admin-action-btn-group">
        <button type="button" class="btn-google-auth admin-inline-btn admin-excel-btn" id="btn-export-excel">
          <span>[ Download Excel (.xls) ]</span>
        </button>
        <button type="button" class="btn-google-auth admin-inline-btn" id="btn-export-csv">
          <span>[ Export current tab (.csv) ]</span>
        </button>
        <button type="button" class="btn-google-auth admin-inline-btn" id="btn-admin-reload">
          <span>[ Reload data ]</span>
        </button>
      </div>
      <button type="button" class="chaitanya-link-btn" id="btn-back-to-profile">[ Back to Profile ]</button>
    </div>
  `;

  const tabContainer = container.querySelector("#admin-tab-container");
  const rerender = () => {
    tabContainer.innerHTML = renderAdminTab(state);
    if (state.tab === "redis") loadRedisStats(tabContainer);
  };

  tabContainer.addEventListener("click", async (evt) => {
    const tabBtn = evt.target.closest(".admin-tab-btn");
    if (tabBtn) {
      state.tab = tabBtn.dataset.tab;
      rerender();
      return;
    }

    const approveBtn = evt.target.closest(".btn-action-approve");
    const rejectBtn = evt.target.closest(".btn-action-reject[data-id]");
    if (approveBtn || rejectBtn) {
      const btn = approveBtn || rejectBtn;
      const payment = state.payments.find((p) => p.paymentId === btn.dataset.id);
      if (!payment) return;
      let reason = null;
      if (rejectBtn) {
        reason = prompt("Reason shown to the participant:", "UTR not found in bank statement");
        if (reason === null) return;
      }
      btn.disabled = true;
      btn.textContent = approveBtn ? "Approving..." : "Rejecting...";
      try {
        const res = approveBtn ? await approvePayment(payment) : await rejectPayment(payment, reason);
        Object.assign(payment, res.payment);
        const reg = state.registrations.find((r) => r.payment_id === payment.paymentId);
        if (reg) reg.payment_status = payment.status;
        const team = state.teams.find((t) => t.teamId === payment.teamId);
        if (team) team.paymentStatus = payment.status === "verified" ? "paid" : payment.status;
        rerender();
      } catch (err) {
        alert(`Could not update payment: ${err.message}`);
        btn.disabled = false;
        btn.textContent = approveBtn ? "✓ Approve" : "✕ Reject";
      }
      return;
    }

    if (evt.target.closest("#btn-refresh-redis")) {
      loadRedisStats(tabContainer);
      return;
    }

    const purgeBtn = evt.target.closest("#btn-purge-redis");
    if (purgeBtn) {
      if (!confirm("Purge the local dev server cache?")) return;
      await fetch("/api/cache/purge", { method: "POST" }).catch(() => {});
      loadRedisStats(tabContainer);
      return;
    }

    const seedBtn = evt.target.closest("#btn-run-schema-seed");
    if (seedBtn) {
      const progressEl = tabContainer.querySelector("#schema-sync-progress");
      seedBtn.disabled = true;
      progressEl.hidden = false;
      progressEl.textContent = "Connecting to Firestore...";
      try {
        const res = await applySchemaToFirestore((p) => (progressEl.textContent = p.message));
        progressEl.textContent = `✓ Synced ${res.eventsCreated} events and ${res.faqsCreated} FAQs.${res.errors?.length ? ` Errors: ${res.errors.join("; ")}` : ""}`;
      } catch (err) {
        progressEl.textContent = `Sync failed: ${err.message}`;
      } finally {
        seedBtn.disabled = false;
      }
    }
  });

  container.querySelector("#btn-export-excel").addEventListener("click", () => exportMasterExcel(state));
  container.querySelector("#btn-export-csv").addEventListener("click", () => exportTabCsv(state));
  container.querySelector("#btn-admin-reload").addEventListener("click", () => renderAdminView(container, getCurrentUser()));
  container.querySelector("#btn-back-to-profile").addEventListener("click", () => openAuthModal("profile"));
}

async function loadRedisStats(root) {
  const el = root.querySelector("#redis-stat-meta");
  if (!el) return;
  try {
    const res = await fetch("/api/cache/stats", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    el.textContent = `Engine: ${d.engine} · hit ratio ${d.hit_ratio_percent || 0}% · hits ${d.hits || 0}/${d.total_requests || 0} · keys ${d.cached_keys || 0}`;
  } catch (err) {
    el.textContent = `Could not load cache stats (${err.message}).`;
  }
}

// ----------------------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------------------

function exportRows(state) {
  const { regRows, leaderContact } = computeAdminData(state);
  return {
    payments: {
      name: "Payments",
      headers: ["Payment ID", "Events", "Teams", "Payer", "Email", "Phone", "Amount (INR)", "UTR", "Status", "Submitted", "Verified/Rejected By", "Reason"],
      rows: state.payments.map((p) => [
        p.paymentId,
        paymentItems(p).map((it) => it.eventTitle).join("; "),
        paymentItems(p).map((it) => it.teamName).filter(Boolean).join("; "),
        p.payerName, p.payerEmail, p.payerPhone, p.amount,
        p.transactionRef, STATUS_LABEL[p.status] || p.status, formatDate(p.createdAt),
        p.verifiedBy || p.rejectedBy, p.rejectionReason,
      ]),
    },
    registrations: {
      name: "Registrations",
      headers: ["Event", "Name", "Email", "Phone", "College", "Year", "Chaitanya ID", "Type", "Team Code", "Team Members", "Pass ID", "Payment", "Registered"],
      rows: regRows.map((r) => [
        r.event_title, r.user_name, r.user_email, r.user_phone, r.user_college, r.user_year, r.student_id,
        r.participation_type === "team" ? `team ${r.team_role || ""}`.trim() : "solo",
        r.team_code, (r.team_members || []).map((m) => m.name).join("; "),
        r.registration_qr_id, STATUS_LABEL[r.payStatus] || r.payStatus, formatDate(r.registered_at),
      ]),
    },
    teams: {
      name: "Teams",
      headers: ["Team", "Code", "Event", "Leader", "Leader Email", "Leader Phone", "Members", "Size", "Max", "Payment"],
      rows: state.teams.map((t) => {
        const c = leaderContact.get(t.teamId) || {};
        return [
          t.teamName, t.teamCode, t.eventName, t.leaderName, c.email, c.phone,
          (t.members || []).map((m) => m.name).join("; "), t.teamSize, t.maxTeamSize, t.paymentStatus,
        ];
      }),
    },
    attendees: {
      name: "Accounts",
      headers: ["Name", "Email", "College", "Year", "Phone", "Chaitanya ID", "Registered Events"],
      rows: state.attendees.map((a) => [
        a.displayName || a.name, a.email, a.college, a.year, a.phone, a.studentId, (a.registeredEvents || []).join("; "),
      ]),
    },
  };
}

// Prevent spreadsheet formula injection from participant-entered text.
function safeCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function exportTabCsv(state) {
  const sheets = exportRows(state);
  const sheet = sheets[state.tab] || sheets.registrations;
  const csvCell = (v) => `"${safeCell(v).replace(/"/g, '""')}"`;
  const csv = [sheet.headers, ...sheet.rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  downloadBlob("﻿" + csv, "text/csv;charset=utf-8", `chaitanya_2k26_${sheet.name.toLowerCase()}_${stamp()}.csv`);
}

function exportMasterExcel(state) {
  const xml = (v) =>
    safeCell(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const sheets = exportRows(state);
  const sheetXml = ({ name, headers, rows }) => `
  <Worksheet ss:Name="${xml(name)}">
    <Table>
      <Row>${headers.map((h) => `<Cell ss:StyleID="H"><Data ss:Type="String">${xml(h)}</Data></Cell>`).join("")}</Row>
      ${rows.map((r) => `<Row>${r.map((c) => `<Cell><Data ss:Type="String">${xml(c)}</Data></Cell>`).join("")}</Row>`).join("\n      ")}
    </Table>
  </Worksheet>`;

  const content = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="H"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#000000" ss:Pattern="Solid"/></Style></Styles>
  ${[sheets.registrations, sheets.payments, sheets.teams, sheets.attendees].map(sheetXml).join("")}
</Workbook>`;

  downloadBlob(content, "application/vnd.ms-excel;charset=utf-8", `chaitanya_2k26_master_${stamp()}.xls`);
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function setBusy(btn, busy, html) {
  btn.innerHTML = busy ? `<span>${e(html)}</span>` : html;
  btn.disabled = busy;
}

function showAuthError(msg) {
  const box = document.getElementById("auth-error-box");
  if (box) {
    box.hidden = false;
    box.style.display = "";
    box.textContent = msg;
  }
}

if (typeof window !== "undefined") {
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.initAuthModal = initAuthModal;
}
