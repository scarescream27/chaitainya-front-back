/**
 * ============================================================================
 * Chaitanya 2k26 — Auth Modal Controller (Login, Register, Profile, Admin)
 * ============================================================================
 */

import {
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
  getRegisteredAttendees,
  getDemoAttendees,
  subscribeAuthState,
  getAllTeams,
  getAllPayments,
  approvePayment,
  rejectPayment,
} from "./auth-service.js";
import { isFirebaseConfigured, getFirebaseConfig, isAdminUser } from "./firebase-config.js";

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

  const registerLinks = document.querySelectorAll('a[href="#register"], a[href="#profile"], a[href="/register"], a[href="/profile"]');
  const loginLinks = document.querySelectorAll('a[href="#login"], a[href="#logout"], a[href="/login"], a[href="/logout"]');

  if (user) {
    const firstName = user.displayName ? user.displayName.split(" ")[0].toUpperCase() : "PROFILE";
    registerLinks.forEach((link) => {
      link.setAttribute("href", "#profile");
      const span = link.querySelector("span");
      if (span) span.textContent = firstName;
      else link.textContent = `[${firstName}]`;
    });

    loginLinks.forEach((link) => {
      link.setAttribute("href", "#logout");
      const span = link.querySelector("span");
      if (span) span.textContent = "LOGOUT";
      else link.textContent = "[LOGOUT]";
    });
  } else {
    registerLinks.forEach((link) => {
      link.setAttribute("href", "#register");
      const span = link.querySelector("span");
      if (span) span.textContent = "Register";
      else link.textContent = "[Register]";
    });

    loginLinks.forEach((link) => {
      link.setAttribute("href", "#login");
      const span = link.querySelector("span");
      if (span) span.textContent = "Login";
      else link.textContent = "[Login]";
    });
  }
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

  if (currentMode === "profile" && user) {
    renderProfileView(body, user);
    return;
  }

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
  const bannerHtml = isConfigured
    ? ""
    : `
      <div class="chaitanya-modal-banner">
        <span>⚡</span>
        <div><strong>Firebase Config Notice:</strong> Running in Demo Mode. Connect your Firebase credentials in <code>_nuxt/firebase-config.js</code> for live Cloud Firestore sync.</div>
      </div>
    `;

  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Portal ]</div>
      <h2 class="chaitanya-modal-title">Sign In</h2>
      <p class="chaitanya-modal-subtitle">Access your fest pass, registered hackathons, and event schedule.</p>
    </div>

    ${bannerHtml}

    <div id="auth-error-box" style="display:none;" class="chaitanya-modal-banner warning"></div>

    <button type="button" class="btn-google-auth" id="btn-do-google-login">
      ${GOOGLE_ICON_SVG}
      <span>[ Continue with Google ]</span>
    </button>

    <div class="chaitanya-divider">
      <span>New Attendee?</span>
    </div>

    <div class="chaitanya-modal-footer">
      Need to register for events? 
      <button type="button" class="chaitanya-link-btn" id="btn-switch-to-register">[ Register Here ]</button>
    </div>
  `;

  const btnLogin = container.querySelector("#btn-do-google-login");
  const btnSwitch = container.querySelector("#btn-switch-to-register");

  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      btnLogin.innerHTML = `<span>Connecting to Google...</span>`;
      btnLogin.style.pointerEvents = "none";
      try {
        await signInWithGoogle();
        closeAuthModal();
      } catch (err) {
        showAuthError(err.message || "Google Authentication failed");
        btnLogin.innerHTML = `${GOOGLE_ICON_SVG}<span>[ Continue with Google ]</span>`;
        btnLogin.style.pointerEvents = "auto";
      }
    });
  }

  if (btnSwitch) {
    btnSwitch.addEventListener("click", () => {
      openAuthModal("register");
    });
  }
}

/**
 * 2. Register View
 */
function renderRegisterView(container, isConfigured) {
  const bannerHtml = isConfigured
    ? ""
    : `
      <div class="chaitanya-modal-banner">
        <span>⚡</span>
        <div><strong>Demo Mode Active:</strong> You can test registration instantly. Attendee records sync directly to Firestore when live keys are configured.</div>
      </div>
    `;

  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Fest Enrollment ]</div>
      <h2 class="chaitanya-modal-title">Register</h2>
      <p class="chaitanya-modal-subtitle">Enroll as a participant for technical, cultural, and esports events.</p>
    </div>

    ${bannerHtml}

    <div id="auth-error-box" style="display:none;" class="chaitanya-modal-banner warning"></div>

    <form id="attendee-register-form">
      <div class="chaitanya-form-group">
        <label class="chaitanya-form-label">College / University</label>
        <input type="text" id="reg-college" class="chaitanya-form-input" placeholder="e.g. HPTU Hamirpur / NIT / UIIT" required />
      </div>

      <div class="chaitanya-form-group">
        <label class="chaitanya-form-label">Contact No</label>
        <input type="tel" id="reg-phone" class="chaitanya-form-input" placeholder="e.g. +91 98765 43210" required />
      </div>

      <div class="chaitanya-form-group">
        <label class="chaitanya-form-label">Event Category Interest</label>
        <input type="text" id="reg-events" class="chaitanya-form-input" placeholder="e.g. Technical AI Hackathon, Esports" />
      </div>

      <div class="chaitanya-divider">
        <span>Verify & Link Identity</span>
      </div>

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
  const btnSwitch = container.querySelector("#btn-switch-to-login");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const college = container.querySelector("#reg-college")?.value || "";
      const phone = container.querySelector("#reg-phone")?.value || "";
      const eventsStr = container.querySelector("#reg-events")?.value || "";
      const registeredEvents = eventsStr ? [eventsStr] : ["Chaitanya Fest General Pass"];

      const btn = container.querySelector("#btn-do-google-register");
      btn.innerHTML = `<span>Registering via Google...</span>`;
      btn.style.pointerEvents = "none";

      try {
        await signInWithGoogle({ college, phone, registeredEvents });
        closeAuthModal();
      } catch (err) {
        showAuthError(err.message || "Registration failed");
        btn.innerHTML = `${GOOGLE_ICON_SVG}<span>[ Register with Google ]</span>`;
        btn.style.pointerEvents = "auto";
      }
    });
  }

  if (btnSwitch) {
    btnSwitch.addEventListener("click", () => {
      openAuthModal("login");
    });
  }
}

/**
 * 3. User Profile View
 */
function renderProfileView(container, user) {
  const eventsHtml = (user.registeredEvents && user.registeredEvents.length > 0)
    ? user.registeredEvents.map((ev) => `<span class="profile-event-chip">${ev}</span>`).join("")
    : `<span style="font-family:IBM Plex Mono; font-size:11px; color:#888;">No events registered yet</span>`;

  const roleClass = user.role === "admin" ? "admin" : "";

  container.innerHTML = `
    <div class="profile-avatar-row">
      <img src="${user.photoURL || '/images/icons/textFace.svg'}" alt="Avatar" class="profile-avatar" />
      <h3 class="profile-name">${user.displayName || "Participant"}</h3>
      <p class="profile-email">${user.email}</p>
      <span class="profile-role-badge ${roleClass}">[ ${user.role || 'ATTENDEE'} ]</span>
    </div>

    <div class="profile-meta-card">
      <div class="profile-meta-row">
        <span class="profile-meta-label">College</span>
        <span class="profile-meta-val">${user.college || "Himachal Pradesh Technical University"}</span>
      </div>
      <div class="profile-meta-row">
        <span class="profile-meta-label">Phone</span>
        <span class="profile-meta-val">${user.phone || "+91 Contact Verified"}</span>
      </div>
      <div class="profile-meta-row">
        <span class="profile-meta-label">Status</span>
        <span class="profile-meta-val">✓ Active Fest Pass</span>
      </div>
    </div>

    <div class="chaitanya-form-group">
      <label class="chaitanya-form-label">Registered Fest Events</label>
      <div class="profile-events-list">
        ${eventsHtml}
      </div>
    </div>

    ${user.role === "admin" ? `
      <button type="button" class="btn-google-auth" id="btn-open-admin-from-profile" style="margin-top:16px;">
        <span>[ Open Admin Dashboard ]</span>
      </button>
    ` : ''}

    <button type="button" class="btn-secondary-action" id="btn-do-sign-out">
      [ Sign Out of Account ]
    </button>
  `;

  const btnSignOut = container.querySelector("#btn-do-sign-out");
  if (btnSignOut) {
    btnSignOut.addEventListener("click", async () => {
      await signOutUser();
      closeAuthModal();
    });
  }

  const btnAdmin = container.querySelector("#btn-open-admin-from-profile");
  if (btnAdmin) {
    btnAdmin.addEventListener("click", () => {
      openAuthModal("admin");
    });
  }
}

/**
 * 4. Admin Panel View
 */
async function renderAdminView(container, user) {
  const card = document.getElementById("chaitanya-modal-content");

  // 1. Not signed in: Prompt specifically for chaitanyahptu@gmail.com
  if (!user) {
    if (card) card.classList.remove("admin-wide");
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ 401 • Security Verification ]</div>
        <h2 class="chaitanya-modal-title">Admin Access</h2>
        <p class="chaitanya-modal-subtitle">Administrator dashboard is restricted exclusively to chaitanyahptu@gmail.com</p>
      </div>
      <div class="chaitanya-modal-banner warning">
        <span>🔒</span>
        <div>Fest administrative tools require signing in with <strong>chaitanyahptu@gmail.com</strong>.</div>
      </div>
      <button type="button" class="btn-google-auth" id="btn-admin-signin">
        ${GOOGLE_ICON_SVG}
        <span>[ Sign In with chaitanyahptu@gmail.com ]</span>
      </button>
      <div class="chaitanya-modal-footer">
        Not an administrator? 
        <button type="button" class="chaitanya-link-btn" id="btn-admin-to-login">[ Attendee Sign In ]</button>
      </div>
    `;

    const btn = container.querySelector("#btn-admin-signin");
    if (btn) {
      btn.addEventListener("click", async () => {
        try {
          await signInWithGoogle({
            email: "chaitanyahptu@gmail.com",
            displayName: "Fest Administrator",
          });
          renderAdminView(container, getCurrentUser());
        } catch (e) {
          showAuthError(e.message);
        }
      });
    }

    const btnLogin = container.querySelector("#btn-admin-to-login");
    if (btnLogin) {
      btnLogin.addEventListener("click", () => {
        openAuthModal("login");
      });
    }
    return;
  }

  // 2. Signed in, but NOT authorized as chaitanyahptu@gmail.com -> 403 Access Denied
  if (!isAdminUser(user.email)) {
    if (card) card.classList.remove("admin-wide");
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ 403 • ACCESS RESTRICTED ]</div>
        <h2 class="chaitanya-modal-title">Access Denied</h2>
        <p class="chaitanya-modal-subtitle">Administrator privileges are restricted exclusively to chaitanyahptu@gmail.com</p>
      </div>

      <div class="chaitanya-modal-banner danger">
        <span>⛔</span>
        <div>
          Currently signed in as <strong>${user.email}</strong>. This account does not possess fest administrator privileges.
        </div>
      </div>

      <div class="profile-meta-card" style="margin-bottom:20px;">
        <div class="profile-meta-row">
          <span class="profile-meta-label">Active Account</span>
          <span class="profile-meta-val">${user.displayName || "Attendee"}</span>
        </div>
        <div class="profile-meta-row">
          <span class="profile-meta-label">Account Role</span>
          <span class="profile-meta-val">${(user.role || 'ATTENDEE').toUpperCase()}</span>
        </div>
        <div class="profile-meta-row">
          <span class="profile-meta-label">Authorized Admin</span>
          <span class="profile-meta-val">chaitanyahptu@gmail.com</span>
        </div>
      </div>

      <button type="button" class="btn-google-auth" id="btn-switch-admin-account">
        ${GOOGLE_ICON_SVG}
        <span>[ Switch to chaitanyahptu@gmail.com ]</span>
      </button>

      <button type="button" class="btn-secondary-action" id="btn-denied-return-profile" style="margin-top:12px;">
        [ Return to My Profile ]
      </button>
    `;

    const btnSwitch = container.querySelector("#btn-switch-admin-account");
    if (btnSwitch) {
      btnSwitch.addEventListener("click", async () => {
        try {
          await signOutUser();
          await signInWithGoogle({
            email: "chaitanyahptu@gmail.com",
            displayName: "Fest Administrator",
          });
          renderAdminView(container, getCurrentUser());
        } catch (e) {
          showAuthError(e.message);
        }
      });
    }

    const btnReturn = container.querySelector("#btn-denied-return-profile");
    if (btnReturn) {
      btnReturn.addEventListener("click", () => {
        openAuthModal("profile");
      });
    }
    return;
  }

  // 3. Authorized Admin: render wide administrative dashboard
  if (card) card.classList.add("admin-wide");

  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Admin Portal ]</div>
      <h2 class="chaitanya-modal-title">Fest Command Center</h2>
      <p class="chaitanya-modal-subtitle">Authorized Admin: ${user.email}</p>
    </div>
    <div style="text-align:center; padding: 20px; font-family:IBM Plex Mono;">
      Loading fest database...
    </div>
  `;

  let attendees = [];
  let teams = [];
  let payments = [];

  try {
    const [attRes, teamRes, payRes] = await Promise.all([
      getRegisteredAttendees().catch(() => []),
      getAllTeams().catch(() => []),
      getAllPayments().catch(() => []),
    ]);
    attendees = attRes && attRes.length ? attRes : getDemoAttendees();
    teams = teamRes && teamRes.length ? teamRes : [];
    payments = payRes && payRes.length ? payRes : [];
  } catch (err) {
    console.warn("Could not load admin data:", err);
    attendees = getDemoAttendees();
  }

  let adminActiveTab = "attendees";

  function renderAdminTabContent() {
    let statsHtml = "";
    let tableHtml = "";
    const pendingPayments = payments.filter((p) => (p.status || "").toLowerCase().includes("pending"));

    if (adminActiveTab === "attendees") {
      const totalUsers = attendees.length;
      const colleges = new Set(attendees.map((a) => a.college).filter(Boolean)).size;
      const totalEvents = attendees.reduce(
        (acc, a) => acc + (a.registeredEvents?.length || 0),
        0,
      );

      statsHtml = `
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-num">${totalUsers}</div>
            <div class="admin-stat-label">Registered Attendees</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${colleges || 1}</div>
            <div class="admin-stat-label">Colleges Represented</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${totalEvents}</div>
            <div class="admin-stat-label">Event Entries</div>
          </div>
        </div>
      `;

      const rows = attendees
        .map(
          (a) => `
          <tr>
            <td><strong>${a.displayName || "Unknown"}</strong></td>
            <td>${a.email || "-"}</td>
            <td>${a.college || "HPTU"}</td>
            <td>${a.phone || "-"}</td>
            <td><span class="profile-role-badge ${a.role === "admin" ? "admin" : ""}" style="font-size:9px; padding:2px 8px;">${a.role || "attendee"}</span></td>
            <td>${(a.registeredEvents || []).join(", ") || "General Pass"}</td>
          </tr>
        `,
        )
        .join("");

      tableHtml = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>College</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" style="text-align:center;">No attendees registered yet</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (adminActiveTab === "teams") {
      const totalTeams = teams.length;
      const totalMembers = teams.reduce((acc, t) => acc + (t.members ? t.members.length : 1), 0);
      const eventsCount = new Set(teams.map((t) => t.eventName).filter(Boolean)).size;

      statsHtml = `
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-num">${totalTeams}</div>
            <div class="admin-stat-label">Registered Squads</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${totalMembers}</div>
            <div class="admin-stat-label">Total Squad Members</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${eventsCount}</div>
            <div class="admin-stat-label">Active Arenas</div>
          </div>
        </div>
      `;

      const rows = teams
        .map(
          (t) => `
          <tr>
            <td><strong>${t.teamName || "Squad"}</strong></td>
            <td><code style="background:#000; color:#fff; padding:2px 6px; border-radius:4px;">${t.teamCode || "-"}</code></td>
            <td>${t.eventName || "-"}</td>
            <td>${t.leaderName || "-"} (${t.leaderEmail || "-"})</td>
            <td>${t.members ? t.members.length : 1} / ${t.maxTeamSize || 4}</td>
            <td><span class="badge-status ${t.paymentStatus || "free"}">${(t.paymentStatus || "free").toUpperCase()}</span></td>
          </tr>
        `,
        )
        .join("");

      tableHtml = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Squad Name</th>
                <th>Team Code</th>
                <th>Arena / Event</th>
                <th>Leader (Contact)</th>
                <th>Size</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" style="text-align:center;">No squads registered yet</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } else if (adminActiveTab === "payments") {
      const totalPay = payments.length;
      const pendingCount = pendingPayments.length;
      const totalVolume = payments
        .filter((p) => (p.status || "").toLowerCase() === "verified")
        .reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

      statsHtml = `
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-num">₹${totalVolume.toLocaleString()}</div>
            <div class="admin-stat-label">Verified Collections</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num" style="color:${pendingCount > 0 ? '#b30000' : '#000'}">${pendingCount}</div>
            <div class="admin-stat-label">Pending Verifications</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-num">${totalPay}</div>
            <div class="admin-stat-label">Total Submissions</div>
          </div>
        </div>
      `;

      const rows = payments
        .map(
          (p) => {
            const isPending = (p.status || "").toLowerCase().includes("pending");
            return `
          <tr data-payment-row="${p.paymentId}">
            <td><strong>${p.eventTitle || p.eventName || "Arena Pass"}</strong></td>
            <td>${p.payerName || p.userName || p.leaderName || "Participant"}<br/><small style="color:#666;">${p.payerEmail || p.userEmail || "-"}</small></td>
            <td><strong>₹${p.amount || 0}</strong></td>
            <td><code style="font-size:11px; background:#f0f0f0; padding:2px 4px; border-radius:3px;">${p.transactionRef || p.utrNumber || "N/A"}</code></td>
            <td><span class="badge-status ${isPending ? "pending" : (p.status || "verified")}" id="status-badge-${p.paymentId}">${(p.status || "pending").toUpperCase()}</span></td>
            <td id="actions-${p.paymentId}">
              ${
                isPending
                  ? `
                  <div class="admin-action-btn-group">
                    <button type="button" class="btn-action-approve" data-id="${p.paymentId}" title="Approve SBI UPI UTR">✓ Approve</button>
                    <button type="button" class="btn-action-reject" data-id="${p.paymentId}" title="Reject invalid UTR">✕ Reject</button>
                  </div>
                `
                  : `<small style="color:#666;">${p.verifiedBy ? "By " + p.verifiedBy.split("@")[0] : "Completed"}</small>`
              }
            </td>
          </tr>
        `;
          },
        )
        .join("");

      tableHtml = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Arena</th>
                <th>Registrant</th>
                <th>Amount</th>
                <th>UPI UTR / Ref</th>
                <th>Status</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" style="text-align:center;">No payment records found</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }

    const pendingPaymentsCount = pendingPayments.length;

    return `
      <div class="admin-tabs-nav">
        <button type="button" class="admin-tab-btn ${adminActiveTab === "attendees" ? "active" : ""}" data-tab="attendees">
          [ 01. ATTENDEES (${attendees.length}) ]
        </button>
        <button type="button" class="admin-tab-btn ${adminActiveTab === "teams" ? "active" : ""}" data-tab="teams">
          [ 02. SQUADS & TEAMS (${teams.length}) ]
        </button>
        <button type="button" class="admin-tab-btn ${adminActiveTab === "payments" ? "active" : ""}" data-tab="payments">
          [ 03. UPI PAYMENTS & UTR (${pendingPaymentsCount} PENDING) ]
        </button>
      </div>
      ${statsHtml}
      ${tableHtml}
    `;
  }

  function renderFullAdmin() {
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Admin Portal ]</div>
        <h2 class="chaitanya-modal-title">Fest Command Center</h2>
        <p class="chaitanya-modal-subtitle">Participant database, squad rosters & UPI verification (Admin: ${user.email})</p>
      </div>

      <div id="admin-tab-container">
        ${renderAdminTabContent()}
      </div>

      <div class="admin-export-bar">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn-google-auth" id="btn-export-excel" style="width:auto; padding:8px 16px; font-size:11px; background:#107c41; color:#fff; border-color:#107c41;">
            <span>[ 📊 Download Master Excel (.xls) ]</span>
          </button>
          <button type="button" class="btn-google-auth" id="btn-export-csv" style="width:auto; padding:8px 14px; font-size:11px;">
            <span>[ 📄 Export CSV ]</span>
          </button>
        </div>
        <button type="button" class="chaitanya-link-btn" id="btn-back-to-profile">
          [ Return to Profile ]
        </button>
      </div>
    `;

    // Attach Tab switching listener
    const tabContainer = container.querySelector("#admin-tab-container");
    if (tabContainer) {
      tabContainer.addEventListener("click", async (e) => {
        const tabBtn = e.target.closest(".admin-tab-btn");
        if (tabBtn) {
          const tab = tabBtn.getAttribute("data-tab");
          if (tab && tab !== adminActiveTab) {
            adminActiveTab = tab;
            tabContainer.innerHTML = renderAdminTabContent();
          }
          return;
        }

        const approveBtn = e.target.closest(".btn-action-approve");
        if (approveBtn) {
          const id = approveBtn.getAttribute("data-id");
          approveBtn.disabled = true;
          approveBtn.textContent = "Verifying...";
          try {
            await approvePayment(id);
            const badge = tabContainer.querySelector(`#status-badge-${id}`);
            if (badge) {
              badge.className = "badge-status verified";
              badge.textContent = "VERIFIED";
            }
            const actionsCell = tabContainer.querySelector(`#actions-${id}`);
            if (actionsCell) {
              actionsCell.innerHTML = `<span style="color:#155724; font-weight:600; font-size:11px;">✓ Verified</span>`;
            }
          } catch (err) {
            alert("Approval failed: " + err.message);
            approveBtn.disabled = false;
            approveBtn.textContent = "✓ Approve";
          }
          return;
        }

        const rejectBtn = e.target.closest(".btn-action-reject");
        if (rejectBtn) {
          const id = rejectBtn.getAttribute("data-id");
          const reason = prompt("Enter rejection reason (or leave default):", "Invalid UTR / Payment Not Received");
          if (reason === null) return;
          rejectBtn.disabled = true;
          rejectBtn.textContent = "Rejecting...";
          try {
            await rejectPayment(id, reason);
            const badge = tabContainer.querySelector(`#status-badge-${id}`);
            if (badge) {
              badge.className = "badge-status rejected";
              badge.textContent = "REJECTED";
            }
            const actionsCell = tabContainer.querySelector(`#actions-${id}`);
            if (actionsCell) {
              actionsCell.innerHTML = `<span style="color:#721c24; font-weight:600; font-size:11px;">✕ Rejected</span>`;
            }
          } catch (err) {
            alert("Rejection failed: " + err.message);
            rejectBtn.disabled = false;
            rejectBtn.textContent = "✕ Reject";
          }
          return;
        }
      });
    }

    // Export Excel button
    const btnExcel = container.querySelector("#btn-export-excel");
    if (btnExcel) {
      btnExcel.addEventListener("click", () => {
        exportMasterExcel(attendees, teams, payments);
      });
    }

    // Export CSV button
    const btnCsv = container.querySelector("#btn-export-csv");
    if (btnCsv) {
      btnCsv.addEventListener("click", () => {
        if (adminActiveTab === "teams") exportTeamsCSV(teams);
        else if (adminActiveTab === "payments") exportPaymentsCSV(payments);
        else exportAttendeesCSV(attendees);
      });
    }

    // Return to Profile button
    const btnBack = container.querySelector("#btn-back-to-profile");
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        openAuthModal("profile");
      });
    }
  }

  renderFullAdmin();
}

function exportMasterExcel(attendees, teams, payments) {
  const escapeXml = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const buildSheet = (name, headers, rows) => `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table>
        <Row>
          ${headers.map((h) => `<Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}
        </Row>
        ${rows
          .map(
            (r) => `
          <Row>
            ${r.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}
          </Row>`
          )
          .join("")}
      </Table>
    </Worksheet>
  `;

  const attendeeHeaders = ["Name", "Email", "College", "Phone", "Role", "Registered Events"];
  const attendeeRows = attendees.map((a) => [
    a.displayName || "Unknown",
    a.email || "-",
    a.college || "HPTU",
    a.phone || "-",
    a.role || "attendee",
    (a.registeredEvents || []).join("; "),
  ]);

  const teamHeaders = ["Team Name", "Team Code", "Arena / Event", "Leader Name", "Leader Email", "Leader Phone", "College", "Members Count", "Payment Status", "Registered At"];
  const teamRows = teams.map((t) => [
    t.teamName || "-",
    t.teamCode || "-",
    t.eventName || "-",
    t.leaderName || "-",
    t.leaderEmail || "-",
    t.leaderPhone || "-",
    t.college || "-",
    t.teamSize || (t.members ? t.members.length : 1),
    (t.paymentStatus || "free").toUpperCase(),
    t.registeredAt ? new Date(t.registeredAt).toLocaleString() : "-",
  ]);

  const paymentHeaders = ["Payment ID", "Arena / Event", "Registrant", "Email", "Phone", "Amount (INR)", "12-Digit UTR", "Status", "Verified By", "Timestamp"];
  const paymentRows = payments.map((p) => [
    p.paymentId || "-",
    p.eventName || "-",
    p.userName || p.leaderName || "-",
    p.userEmail || "-",
    p.userPhone || "-",
    p.amount || 0,
    p.utrNumber || "-",
    (p.status || "pending").toUpperCase(),
    p.verifiedBy || "-",
    p.submittedAt ? new Date(p.submittedAt).toLocaleString() : "-",
  ]);

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="HeaderStyle">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#000000" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${buildSheet("Attendees", attendeeHeaders, attendeeRows)}
 ${buildSheet("Teams & Squads", teamHeaders, teamRows)}
 ${buildSheet("Payments & UTRs", paymentHeaders, paymentRows)}
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chaitanya_2k26_master_database_${Date.now()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportTeamsCSV(teams) {
  const headers = ["TeamName,TeamCode,EventName,LeaderName,LeaderEmail,LeaderPhone,College,TeamSize,PaymentStatus,RegisteredAt"];
  const rows = teams.map((t) =>
    [
      `"${t.teamName || ""}"`,
      `"${t.teamCode || ""}"`,
      `"${t.eventName || ""}"`,
      `"${t.leaderName || ""}"`,
      `"${t.leaderEmail || ""}"`,
      `"${t.leaderPhone || ""}"`,
      `"${t.college || ""}"`,
      `"${t.teamSize || (t.members ? t.members.length : 1)}"`,
      `"${t.paymentStatus || "free"}"`,
      `"${t.registeredAt || ""}"`,
    ].join(","),
  );

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `chaitanya_2k26_squads_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPaymentsCSV(payments) {
  const headers = ["PaymentId,EventName,UserName,UserEmail,UserPhone,Amount,UTRNumber,Status,VerifiedBy,SubmittedAt"];
  const rows = payments.map((p) =>
    [
      `"${p.paymentId || ""}"`,
      `"${p.eventName || ""}"`,
      `"${p.userName || p.leaderName || ""}"`,
      `"${p.userEmail || ""}"`,
      `"${p.userPhone || ""}"`,
      `"${p.amount || 0}"`,
      `"${p.utrNumber || ""}"`,
      `"${p.status || "pending"}"`,
      `"${p.verifiedBy || ""}"`,
      `"${p.submittedAt || ""}"`,
    ].join(","),
  );

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `chaitanya_2k26_payments_utr_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAttendeesCSV(attendees) {
  const headers = ["Name,Email,College,Phone,Role,RegisteredEvents"];
  const rows = attendees.map((a) =>
    [
      `"${a.displayName || ""}"`,
      `"${a.email || ""}"`,
      `"${a.college || ""}"`,
      `"${a.phone || ""}"`,
      `"${a.role || "attendee"}"`,
      `"${(a.registeredEvents || []).join("; ")}"`,
    ].join(","),
  );

  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `chaitanya_2k26_registrations_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showAuthError(msg) {
  const box = document.getElementById("auth-error-box");
  if (box) {
    box.style.display = "block";
    box.textContent = msg;
  }
}

if (typeof window !== "undefined") {
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.initAuthModal = initAuthModal;
}
