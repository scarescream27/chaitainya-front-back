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

  // 1. Not signed in: Prompt specifically for chaitainyahptu@gmail.com
  if (!user) {
    if (card) card.classList.remove("admin-wide");
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ 401 • Security Verification ]</div>
        <h2 class="chaitanya-modal-title">Admin Access</h2>
        <p class="chaitanya-modal-subtitle">Administrator dashboard is restricted exclusively to chaitainyahptu@gmail.com</p>
      </div>
      <div class="chaitanya-modal-banner warning">
        <span>🔒</span>
        <div>Fest administrative tools require signing in with <strong>chaitainyahptu@gmail.com</strong>.</div>
      </div>
      <button type="button" class="btn-google-auth" id="btn-admin-signin">
        ${GOOGLE_ICON_SVG}
        <span>[ Sign In with chaitainyahptu@gmail.com ]</span>
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
            email: "chaitainyahptu@gmail.com",
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

  // 2. Signed in, but NOT authorized as chaitainyahptu@gmail.com -> 403 Access Denied
  if (!isAdminUser(user.email)) {
    if (card) card.classList.remove("admin-wide");
    container.innerHTML = `
      <div class="chaitanya-modal-header">
        <div class="chaitanya-modal-tag">[ 403 • ACCESS RESTRICTED ]</div>
        <h2 class="chaitanya-modal-title">Access Denied</h2>
        <p class="chaitanya-modal-subtitle">Administrator privileges are restricted exclusively to chaitainyahptu@gmail.com</p>
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
          <span class="profile-meta-val">chaitainyahptu@gmail.com</span>
        </div>
      </div>

      <button type="button" class="btn-google-auth" id="btn-switch-admin-account">
        ${GOOGLE_ICON_SVG}
        <span>[ Switch to chaitainyahptu@gmail.com ]</span>
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
            email: "chaitainyahptu@gmail.com",
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
      <h2 class="chaitanya-modal-title">Fest Registrations</h2>
      <p class="chaitanya-modal-subtitle">Authorized Admin: ${user.email}</p>
    </div>
    <div style="text-align:center; padding: 20px; font-family:IBM Plex Mono;">
      Loading registered attendees...
    </div>
  `;

  let attendees = [];
  try {
    attendees = await getRegisteredAttendees();
  } catch (err) {
    console.warn("Could not load attendees:", err);
  }
  if (!attendees || attendees.length === 0) {
    attendees = getDemoAttendees();
  }

  const totalUsers = attendees.length;
  const colleges = new Set(attendees.map((a) => a.college).filter(Boolean)).size;
  const totalEvents = attendees.reduce(
    (acc, a) => acc + (a.registeredEvents?.length || 0),
    0,
  );

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

  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <div class="chaitanya-modal-tag">[ Chaitanya 2k26 • Admin Portal ]</div>
      <h2 class="chaitanya-modal-title">Fest Registrations</h2>
      <p class="chaitanya-modal-subtitle">Participant database and event enrollment management (Admin: ${user.email})</p>
    </div>

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
          ${rows}
        </tbody>
      </table>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <button type="button" class="btn-google-auth" id="btn-export-csv" style="width:auto; padding:8px 16px; font-size:11px;">
        <span>[ Export CSV ]</span>
      </button>
      <button type="button" class="chaitanya-link-btn" id="btn-back-to-profile">
        [ Return to Profile ]
      </button>
    </div>
  `;

  const btnExport = container.querySelector("#btn-export-csv");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      exportAttendeesCSV(attendees);
    });
  }

  const btnBack = container.querySelector("#btn-back-to-profile");
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      openAuthModal("profile");
    });
  }
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
