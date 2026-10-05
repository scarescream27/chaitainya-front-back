/**
 * ============================================================================
 * Chaitanya 2k26 — Profile overlay
 * ============================================================================
 * A small floating glass panel opened from the profile icon. The current page
 * stays visible (blurred) underneath; nothing navigates. Sections:
 *   Profile · Registrations · Digital ID     (+ Logout at the bottom)
 * Also hosts the organiser "verify" view opened by scanning a Digital ID QR
 * (URL: /?verify=CH26-XXXXXXXX).
 */

import {
  getCurrentUser,
  subscribeAuthState,
  updateMyProfile,
  signOutUser,
  getMyRegistrations,
  resubmitPaymentUtr,
  verifyStudentId,
  YEAR_OPTIONS,
} from "./auth-service.js";
import { getEventById, googleCalendarLink } from "./events-data.js";
import { getCartItems, removeFromCart, subscribeCart } from "./cart.js";
import { isAdminUser } from "./firebase-config.js";
import { qrSvg } from "./qr.js";
import { escapeHtml as e } from "./fest-config.js";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "registrations", label: "Registrations" },
  { id: "id", label: "Digital ID" },
];

let root = null;
let section = "profile";
let open = false;
let verifyId = null;
let regsCache = null;
let lastFocus = null;

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function avatarHtml(user, cls = "pp-avatar") {
  return user?.photoURL
    ? `<img class="${cls}" src="${e(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="${cls} pp-avatar-initials" aria-hidden="true">${e(initials(user?.displayName))}</span>`;
}

function ensureRoot() {
  if (root && document.body.contains(root)) return root;
  root = document.createElement("div");
  root.id = "profile-overlay";
  root.className = "pp-overlay";
  root.innerHTML = `<section class="pp-panel" role="dialog" aria-modal="true" aria-labelledby="pp-title"></section>`;
  document.body.appendChild(root);

  // Click outside the panel closes it.
  root.addEventListener("mousedown", (evt) => {
    if (evt.target === root) closeProfilePanel();
  });
  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  document.addEventListener("keydown", (evt) => {
    if (open && evt.key === "Escape") {
      evt.preventDefault(); // tells other Escape handlers this press was used
      closeProfilePanel();
    }
  });
  return root;
}

/**
 * Open the overlay on a section ("profile" | "registrations" | "id").
 */
export function openProfilePanel(target = "profile") {
  const user = getCurrentUser();
  if (!user && !verifyId) {
    window.openAuthModal?.("login");
    return;
  }
  ensureRoot();
  section = SECTIONS.some((s) => s.id === target) ? target : "profile";
  if (target === "registrations") regsCache = null;
  lastFocus = document.activeElement;
  render();
  open = true;
  document.documentElement.classList.add("pp-open");
  requestAnimationFrame(() => {
    root.classList.add("active");
    root.querySelector(".pp-close")?.focus({ preventScroll: true });
  });
}

export function closeProfilePanel() {
  if (!root || !open) return;
  open = false;
  root.classList.remove("active");
  document.documentElement.classList.remove("pp-open");
  if (verifyId) {
    verifyId = null;
    const url = new URL(window.location.href);
    url.searchParams.delete("verify");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  lastFocus?.focus?.({ preventScroll: true });
}

function render() {
  const panel = root.querySelector(".pp-panel");
  const user = getCurrentUser();

  if (verifyId) {
    panel.innerHTML = `
      <header class="pp-head">
        <div class="pp-head-text"><span class="pp-kicker">CHAITANYA 2K26</span><h2 id="pp-title" class="pp-title">ID VERIFICATION</h2></div>
        <button type="button" class="pp-close" data-pp="close" aria-label="Close">✕</button>
      </header>
      <div class="pp-body" id="pp-body"><div class="pp-loading">Checking ID…</div></div>`;
    renderVerify(panel.querySelector("#pp-body"));
    return;
  }

  panel.innerHTML = `
    <header class="pp-head">
      ${avatarHtml(user)}
      <div class="pp-head-text">
        <h2 id="pp-title" class="pp-title">${e(user.displayName)}</h2>
        <span class="pp-sub">${e(user.email)}</span>
      </div>
      <button type="button" class="pp-close" data-pp="close" aria-label="Close">✕</button>
    </header>
    <nav class="pp-tabs" role="tablist">
      ${SECTIONS.map(
        (s) => `<button type="button" role="tab" aria-selected="${s.id === section}" class="pp-tab ${s.id === section ? "active" : ""}" data-pp="tab" data-section="${s.id}">${s.label}</button>`
      ).join("")}
    </nav>
    <div class="pp-body" id="pp-body" role="tabpanel"></div>
    <footer class="pp-foot">
      <button type="button" class="pp-logout" data-pp="logout">Log out</button>
    </footer>`;
  renderSection();
}

function renderSection() {
  const body = root.querySelector("#pp-body");
  if (!body) return;
  body.classList.remove("pp-enter");
  void body.offsetWidth; // restart the enter transition
  body.classList.add("pp-enter");
  if (section === "profile") renderProfile(body);
  else if (section === "registrations") renderRegistrations(body);
  else renderDigitalId(body);
}

// ----------------------------------------------------------------------------
// PROFILE
// ----------------------------------------------------------------------------

function renderProfile(body) {
  const user = getCurrentUser();
  body.innerHTML = `
    <form class="pp-form" data-form="profile" novalidate>
      <label class="pp-field"><span>Name</span>
        <input type="text" name="displayName" maxlength="120" value="${e(user.displayName)}" autocomplete="name" required />
      </label>
      <label class="pp-field"><span>College</span>
        <input type="text" name="college" maxlength="120" value="${e(user.college)}" placeholder="e.g. HPTU Hamirpur" autocomplete="organization" />
      </label>
      <label class="pp-field"><span>Year</span>
        <select name="year">
          <option value="">Select year</option>
          ${YEAR_OPTIONS.map((y) => `<option ${y === user.year ? "selected" : ""}>${e(y)}</option>`).join("")}
        </select>
      </label>
      <label class="pp-field"><span>Phone</span>
        <input type="tel" name="phone" maxlength="20" value="${e(user.phone)}" placeholder="+91 9XXXX XXXXX" autocomplete="tel" />
      </label>
      <p class="pp-hint">Your profile picture comes from your Google account.</p>
      <div class="pp-msg" role="status" hidden></div>
      <button type="submit" class="pp-primary">Save profile</button>
    </form>`;
}

// ----------------------------------------------------------------------------
// REGISTRATIONS
// ----------------------------------------------------------------------------

const STATUS_CHIP = {
  booked: { label: "BOOKED", cls: "ok" },
  pending: { label: "PAYMENT PENDING", cls: "pending" },
  rejected: { label: "PAYMENT NOT VERIFIED", cls: "bad" },
  cart: { label: "IN CART", cls: "cart" },
};

async function renderRegistrations(body) {
  body.innerHTML = `<div class="pp-loading">Loading your registrations…</div>`;
  let regs = regsCache;
  if (!regs) {
    try {
      regs = regsCache = await getMyRegistrations();
    } catch (err) {
      body.innerHTML = `<div class="pp-empty">${e(err.message)}</div>`;
      return;
    }
  }
  if (section !== "registrations" || !open) return;

  const cart = getCartItems().filter((c) => !regs.some((r) => r.registration.event_id === c.eventId));
  const rows = regs.map(({ registration: r, payment, team, status }) => {
    const ev = getEventById(r.event_id);
    const chip = STATUS_CHIP[status];
    const cal = status === "booked" ? googleCalendarLink(ev) : null;
    const isLeader = team && team.leaderUid === r.user_id;
    return `
      <li class="pp-reg">
        <div class="pp-reg-top">
          <strong>${e(r.event_title)}</strong>
          <span class="pp-chip ${chip.cls}">${chip.label}</span>
        </div>
        <span class="pp-reg-meta">${e(ev ? `${ev.date} · ${ev.time}` : "")}</span>
        ${team ? `<span class="pp-reg-meta">Team ${e(team.teamName)}${isLeader ? ` · code <b class="mono">${e(team.teamCode)}</b>` : ""}</span>` : ""}
        <div class="pp-reg-actions">
          ${cal ? `<a class="pp-action" href="${e(cal)}" target="_blank" rel="noopener noreferrer">+ Add to Google Calendar</a>` : ""}
          ${status === "booked" && !cal ? `<span class="pp-reg-note">Calendar link once timings are announced</span>` : ""}
          ${status === "pending" ? `<span class="pp-reg-note">The fest team is verifying your payment.</span>` : ""}
        </div>
        ${status === "rejected" && payment ? `
          <form class="pp-utr" data-form="utr" data-payment="${e(payment.paymentId)}" novalidate>
            <span class="pp-reg-note">${e(payment.rejectionReason || "We couldn't match your UTR.")}</span>
            <input type="text" name="utr" inputmode="numeric" maxlength="12" placeholder="Correct 12-digit UTR" aria-label="Correct 12-digit UTR" />
            <button type="submit" class="pp-action">Resubmit</button>
          </form>` : ""}
      </li>`;
  });

  const cartRows = cart.map(
    (c) => `
      <li class="pp-reg">
        <div class="pp-reg-top">
          <strong>${e(c.event.title)}</strong>
          <span class="pp-chip cart">${STATUS_CHIP.cart.label}</span>
        </div>
        <span class="pp-reg-meta">${e(`${c.event.date} · ${c.event.time}`)}</span>
        <div class="pp-reg-actions">
          <button type="button" class="pp-action" data-pp="checkout">Complete registration →</button>
          <button type="button" class="pp-action subtle" data-pp="cart-remove" data-event-id="${e(c.eventId)}">Remove</button>
        </div>
      </li>`
  );

  body.innerHTML =
    rows.length || cartRows.length
      ? `<ul class="pp-regs">${rows.join("")}${cartRows.join("")}</ul>`
      : `<div class="pp-empty">
           <p>No registrations yet.</p>
           <a class="pp-primary" href="/events" data-pp="browse">Browse events</a>
         </div>`;
}

// ----------------------------------------------------------------------------
// DIGITAL ID
// ----------------------------------------------------------------------------

function verifyUrl(studentId) {
  return `${window.location.origin}/?verify=${encodeURIComponent(studentId)}`;
}

async function renderDigitalId(body) {
  const user = getCurrentUser();
  body.innerHTML = `<div class="pp-loading">Preparing your ID…</div>`;
  let regs = regsCache;
  if (!regs) {
    try {
      regs = regsCache = await getMyRegistrations();
    } catch {
      regs = [];
    }
  }
  if (section !== "id" || !open) return;

  const booked = regs.filter((r) => r.status === "booked").length;
  const pending = regs.filter((r) => r.status === "pending").length;
  const state = booked ? "verified" : pending ? "pending" : "none";
  const stateLabel = {
    verified: `✓ VERIFIED PARTICIPANT · ${booked} EVENT${booked > 1 ? "S" : ""}`,
    pending: "⏳ PAYMENT VERIFICATION PENDING",
    none: "NOT REGISTERED FOR ANY EVENT YET",
  }[state];
  const incomplete = !user.college || !user.year;

  body.innerHTML = `
    <article class="pp-idcard ${state}">
      <div class="pp-idcard-head">
        <span>CHAITANYA 2K26</span>
        <span>DIGITAL ID</span>
      </div>
      <div class="pp-idcard-main">
        ${avatarHtml(user, "pp-id-photo")}
        <dl>
          <dt>NAME</dt><dd>${e(user.displayName)}</dd>
          <dt>COLLEGE</dt><dd>${e(user.college || "—")}</dd>
          <dt>YEAR</dt><dd>${e(user.year || "—")}</dd>
          <dt>ID</dt><dd class="mono">${e(user.studentId || "—")}</dd>
        </dl>
      </div>
      <div class="pp-idcard-qr">${user.studentId ? qrSvg(verifyUrl(user.studentId), { label: `Verification QR for ${user.studentId}` }) : ""}</div>
      <div class="pp-idcard-status">${stateLabel}</div>
    </article>
    ${incomplete ? `<p class="pp-hint">Add your college and year in <button type="button" class="pp-inline" data-pp="tab" data-section="profile">Profile</button> so they appear on your ID.</p>` : ""}
    <p class="pp-hint">Show this at the venue. Organisers scan the QR to confirm your registrations live.</p>`;
}

// ----------------------------------------------------------------------------
// ORGANISER VERIFY VIEW
// ----------------------------------------------------------------------------

async function renderVerify(body) {
  const user = getCurrentUser();
  if (!user) {
    body.innerHTML = `
      <div class="pp-empty">
        <p>Scanned ID <b class="mono">${e(verifyId)}</b></p>
        <p>Only Chaitanya 2k26 organisers can verify IDs. Sign in with your organiser account.</p>
        <button type="button" class="pp-primary" data-pp="verify-login">Sign in</button>
      </div>`;
    return;
  }
  if (!isAdminUser(user.email)) {
    body.innerHTML = `
      <div class="pp-empty">
        <p>Scanned ID <b class="mono">${e(verifyId)}</b></p>
        <p>${e(user.email)} isn't an organiser account, so this ID can't be verified here.</p>
      </div>`;
    return;
  }

  try {
    const res = await verifyStudentId(verifyId);
    if (!res.found) {
      body.innerHTML = `<div class="pp-verify bad"><strong>✕ NOT FOUND</strong><p>No participant has the ID <b class="mono">${e(verifyId)}</b>. Do not admit.</p></div>`;
      return;
    }
    const p = res.profile;
    const chips = res.events.length
      ? res.events.map((ev) => `<li><span>${e(ev.title)}</span><span class="pp-chip ${STATUS_CHIP[ev.status].cls}">${STATUS_CHIP[ev.status].label}</span></li>`).join("")
      : `<li><span>No registrations</span></li>`;
    body.innerHTML = `
      <div class="pp-verify ${res.verified ? "ok" : "bad"}">
        <strong>${res.verified ? "✓ VERIFIED PARTICIPANT" : "✕ NOT VERIFIED"}</strong>
        <p>${res.verified ? "Has at least one confirmed booking." : "No confirmed booking yet."}</p>
      </div>
      <div class="pp-idcard-main">
        ${avatarHtml({ photoURL: p.photoURL, displayName: p.displayName }, "pp-id-photo")}
        <dl>
          <dt>NAME</dt><dd>${e(p.displayName)}</dd>
          <dt>COLLEGE</dt><dd>${e(p.college || "—")}</dd>
          <dt>YEAR</dt><dd>${e(p.year || "—")}</dd>
          <dt>ID</dt><dd class="mono">${e(p.studentId)}</dd>
        </dl>
      </div>
      <ul class="pp-verify-events">${chips}</ul>`;
  } catch (err) {
    body.innerHTML = `<div class="pp-empty">${e(err.message)}</div>`;
  }
}

export function openVerifyView(id) {
  verifyId = String(id || "").trim().toUpperCase();
  ensureRoot();
  render();
  open = true;
  document.documentElement.classList.add("pp-open");
  requestAnimationFrame(() => root.classList.add("active"));
}

// ----------------------------------------------------------------------------
// EVENTS
// ----------------------------------------------------------------------------

async function onClick(evt) {
  const btn = evt.target.closest("[data-pp]");
  if (!btn) return;
  const action = btn.dataset.pp;
  if (action === "close") return closeProfilePanel();
  if (action === "tab") {
    section = btn.dataset.section;
    root.querySelectorAll(".pp-tab").forEach((t) => {
      const on = t.dataset.section === section;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    return renderSection();
  }
  if (action === "logout") {
    btn.disabled = true;
    await signOutUser();
    closeProfilePanel();
    window.openAuthModal?.("login");
    return;
  }
  if (action === "checkout") {
    closeProfilePanel();
    if (typeof window.openEventsCart === "function" && document.getElementById("events-cart-overlay")) {
      window.openEventsCart();
    } else {
      window.location.href = "/events?cart=1";
    }
    return;
  }
  if (action === "cart-remove") {
    removeFromCart(btn.dataset.eventId);
    return renderSection();
  }
  if (action === "browse") {
    closeProfilePanel();
    return;
  }
  if (action === "verify-login") {
    window.openAuthModal?.("login");
  }
}

async function onSubmit(evt) {
  const form = evt.target.closest("form[data-form]");
  if (!form) return;
  evt.preventDefault();

  if (form.dataset.form === "profile") {
    const msg = form.querySelector(".pp-msg");
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await updateMyProfile({
        displayName: form.displayName.value,
        college: form.college.value,
        year: form.year.value,
        phone: form.phone.value,
      });
      msg.textContent = "✓ Saved";
      msg.className = "pp-msg ok";
      root.querySelector(".pp-title").textContent = getCurrentUser().displayName;
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "pp-msg bad";
    }
    msg.hidden = false;
    btn.disabled = false;
  }

  if (form.dataset.form === "utr") {
    const input = form.utr;
    try {
      await resubmitPaymentUtr(form.dataset.payment, input.value.replace(/\D/g, ""));
      regsCache = null;
      renderSection();
    } catch (err) {
      input.setCustomValidity(err.message);
      input.reportValidity();
      setTimeout(() => input.setCustomValidity(""), 3000);
    }
  }
}

// ----------------------------------------------------------------------------
// BOOT
// ----------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.openProfilePanel = openProfilePanel;
  window.closeProfilePanel = closeProfilePanel;

  subscribeAuthState((user) => {
    regsCache = null;
    if (!open) return;
    if (verifyId) render();
    else if (!user) closeProfilePanel();
    else render();
  });
  subscribeCart(() => {
    if (open && section === "registrations") renderSection();
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("verify")) {
    const id = params.get("verify");
    const start = () => openVerifyView(id);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else setTimeout(start, 0);
  }
}
