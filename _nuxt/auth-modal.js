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
  subscribeAuthState,
  initFirebase,
} from "./auth-service.js";
import { isFirebaseConfigured, isAdminUser } from "./firebase-config.js";
import { escapeHtml as e } from "./fest-config.js";
import { openProfilePanel } from "./profile-panel.js";

const DEMO_BANNER = `
  <div class="chaitanya-modal-banner">
    <span aria-hidden="true">⚡</span>
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
let afterSignIn = null; // e.g. open the profile once a signed-out visitor signs in
let lastFocus = null; // element that opened the dialog; focus returns there on close

// ----------------------------------------------------------------------------
// DIALOG ACCESSIBILITY (focus in / trap / restore, background inert)
// ----------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab / Shift+Tab cycling inside `container`. */
function trapTab(evt, container) {
  const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
  if (!items.length) {
    evt.preventDefault();
    container.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (!container.contains(active)) {
    evt.preventDefault();
    (evt.shiftKey ? last : first).focus();
  } else if (evt.shiftKey && (active === first || active === container)) {
    evt.preventDefault();
    last.focus();
  } else if (!evt.shiftKey && active === last) {
    evt.preventDefault();
    first.focus();
  }
}

/**
 * The page app (#__nuxt) is inert while the sign-in dialog or the organiser
 * verify overlay is open (both live outside it, on <body>). The data flag
 * means we only ever remove an inert that one of these dialogs set.
 */
function syncAppInert() {
  const app = document.getElementById("__nuxt");
  if (!app) return;
  const anyOpen = document.querySelector("#chaitanya-auth-backdrop.active, #profile-overlay.active");
  // Body-level floating buttons (events cart / back-to-top) sit outside #__nuxt.
  document.documentElement.classList.toggle("dialog-open", Boolean(anyOpen));
  if (anyOpen) {
    // Leave an inert set by someone else (e.g. an events-page drawer) alone.
    if (!app.inert) {
      app.inert = true;
      app.dataset.dialogInert = "1";
    }
  } else if (app.dataset.dialogInert) {
    app.inert = false;
    delete app.dataset.dialogInert;
  }
}

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
      <div class="chaitanya-modal-card" id="chaitanya-modal-content" role="dialog" aria-modal="true" aria-labelledby="chaitanya-modal-title" aria-describedby="chaitanya-modal-subtitle" tabindex="-1">
        <span class="corner corner-tl" aria-hidden="true">+</span>
        <span class="corner corner-bl" aria-hidden="true">+</span>
        <span class="corner corner-br" aria-hidden="true">+</span>
        <div class="chaitanya-modal-topbar">
          <button type="button" class="chaitanya-modal-close" id="chaitanya-modal-close-btn">[ ESC / CLOSE ]</button>
        </div>
        <div id="chaitanya-modal-body"></div>
      </div>
    `;

    modalBackdrop.inert = true; // closed: nothing inside is focusable
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
      if (!modalBackdrop.classList.contains("active")) return;
      if (e.key === "Escape") {
        e.preventDefault(); // tells other Escape handlers this press was used
        closeAuthModal();
      } else if (e.key === "Tab") {
        const card = modalBackdrop.querySelector(".chaitanya-modal-card");
        if (card) trapTab(e, card);
      }
    });

    // Delegated click handler for navbar and any in-page auth buttons
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest("a");
      if (!anchor || e.defaultPrevented) return;
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
        signOutUser().then(() => {
          if (window.location.pathname.replace(/\/$/, "") === "/profile") goToPage("/");
        });
      }
    });

    // Listen to hash and route changes (#login, #register, #admin, /login, /register, /admin)
    window.addEventListener("hashchange", checkUrlRoute);
    window.addEventListener("popstate", checkUrlRoute);
    // Wait for the first auth state so signed-in visitors aren't shown Register.
    initFirebase().finally(checkUrlRoute);

    // Subscribe to auth changes to keep navbar updated
    subscribeAuthState(syncNavbarAuthState);
    // Signed in (popup, redirect or another tab): leave Sign In / Create Account.
    subscribeAuthState((user) => {
      if (user && modalBackdrop?.classList.contains("active")) {
        closeAuthModal();
        runAfterSignIn();
      }
    });
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
  const mode =
    hash === "#login" || path === "/login" ? "login"
    : hash === "#register" || path === "/register" ? "register"
    : hash === "#admin" ? "admin"
    : hash === "#profile" ? "profile"
    : null;
  if (!mode) return;
  // /login and /register aren't app routes: open the dialog over Home
  // instead of the 404 page.
  if (path === "/login" || path === "/register") {
    window.__deepLinkPending = false; // index.html would otherwise keep the deep link
    const router = document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
    // The router may already resolve this to "/" (then replace() is a no-op),
    // so fix the address bar directly too.
    router?.replace("/");
    history.replaceState(history.state, "", "/");
  }
  openAuthModal(mode);
}

/**
 * Open modal in specific mode
 */
export function openAuthModal(mode = "login", options = {}) {
  // The organiser dashboard is its own page now.
  if (mode === "admin") {
    closeAuthModal();
    goToPage("/admin");
    return;
  }
  const user = getCurrentUser();
  // Signed-in users never see Login/Register: send them to their profile.
  if (user && (mode === "profile" || mode === "login" || mode === "register")) {
    closeAuthModal();
    openProfilePanel(options.section || "profile");
    return;
  }
  // Profile requested while signed out: sign in first, then open it.
  if (mode === "profile") {
    afterSignIn = () => openProfilePanel(options.section || "profile");
    mode = "login";
  } else if (mode !== "admin" && !options.keepAfterSignIn) {
    afterSignIn = options.afterSignIn || null;
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


  const wasOpen = Boolean(modalBackdrop?.classList.contains("active"));
  if (!wasOpen) lastFocus = document.activeElement;
  renderModalContent();
  if (!modalBackdrop) return;
  modalBackdrop.inert = false;
  modalBackdrop.classList.add("active");
  syncAppInert();
  // Move focus into the dialog (also after switching Sign in <-> Register,
  // which replaces the button that had focus). The card is labelled by the
  // visible title, so screen readers announce it.
  modalBackdrop.querySelector(".chaitanya-modal-card")?.focus({ preventScroll: true });
}

/**
 * Close modal
 */
export function closeAuthModal() {
  if (modalBackdrop) {
    const wasOpen = modalBackdrop.classList.contains("active");
    modalBackdrop.classList.remove("active");
    modalBackdrop.inert = true;
    syncAppInert();
    if (wasOpen) {
      const target = lastFocus;
      lastFocus = null;
      if (target?.isConnected && typeof target.focus === "function" && target !== document.body) {
        target.focus({ preventScroll: true });
      } else {
        // Opener was re-rendered away (e.g. the verify overlay's sign-in button).
        document.querySelector("#profile-overlay.active .pp-panel")?.focus({ preventScroll: true });
      }
    }
    // Clear hash if it matches modal trigger
    if (
      window.location.hash === "#login" ||
      window.location.hash === "#register" ||
      window.location.hash === "#admin"
    ) {
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
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
      <h2 class="chaitanya-modal-title" id="chaitanya-modal-title">Sign In</h2>
      <p class="chaitanya-modal-subtitle" id="chaitanya-modal-subtitle">Sign in with Google to register for events and view your entry passes.</p>
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
      <button type="button" class="chaitanya-link-btn" id="btn-switch-to-register">[ Create Account ]</button>
    </div>
  `;

  const btnLogin = container.querySelector("#btn-do-google-login");
  btnLogin.addEventListener("click", async () => {
    setBusy(btnLogin, true, "Connecting to Google...");
    try {
      const res = await signInWithGoogle();
      closeAuthModal();
      if (!res?.redirect) runAfterSignIn();
    } catch (err) {
      showAuthError(err.message || "Google sign-in failed.");
      setBusy(btnLogin, false, `${GOOGLE_ICON_SVG}<span>[ Continue with Google ]</span>`);
    }
  });

  container.querySelector("#btn-switch-to-register").addEventListener("click", () => openAuthModal("register", { keepAfterSignIn: true }));
}

/**
 * 2. Register View
 */
function renderRegisterView(container, isConfigured) {
  container.innerHTML = `
    <div class="chaitanya-modal-header">
      <h2 class="chaitanya-modal-title" id="chaitanya-modal-title">Create Account</h2>
      <p class="chaitanya-modal-subtitle" id="chaitanya-modal-subtitle">Create your fest account, then pick events on the Events page.</p>
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
      const res = await signInWithGoogle({ college, phone, year });
      closeAuthModal();
      if (!res?.redirect) runAfterSignIn();
    } catch (err) {
      showAuthError(err.message || "Registration failed.");
      setBusy(btn, false, `${GOOGLE_ICON_SVG}<span>[ Register with Google ]</span>`);
    }
  });

  container.querySelector("#btn-switch-to-login").addEventListener("click", () => openAuthModal("login", { keepAfterSignIn: true }));
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function runAfterSignIn() {
  const next = afterSignIn;
  afterSignIn = null;
  if (typeof next === "function") next();
}

function goToPage(path) {
  const router = document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
  if (router) router.push(path);
  else window.location.href = path;
}

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
