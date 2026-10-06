/**
 * ============================================================================
 * Chaitanya 2k26 — Profile page (/profile) and organiser verify overlay
 * ============================================================================
 * The profile is a full page, laid out top to bottom:
 *   Account header · Your details (editable) · My registrations (with entry
 *   QR codes) · Digital ID
 * openProfilePanel(section) navigates to /profile#section (kept under its old
 * name because the events page and auth modal call it).
 *
 * The organiser "verify" view opened by scanning a Digital ID QR
 * (URL: /?verify=CH26-XXXXXXXX) is still a small overlay.
 */

import {
  initFirebase,
  getCurrentUser,
  subscribeAuthState,
  updateMyProfile,
  signOutUser,
  getMyRegistrations,
  resubmitPaymentUtr,
  verifyStudentId,
  registrationQrPayload,
  canCancelRegistration,
  cancelRegistration,
  deleteMyProfile,
  YEAR_OPTIONS,
} from "./auth-service.js";
import { getEventById, googleCalendarLink } from "./events-data.js";
import { getCartItems, removeFromCart, subscribeCart } from "./cart.js";
import { isAdminUser } from "./firebase-config.js";
import { qrSvg } from "./qr.js";
import { escapeHtml as e } from "./fest-config.js";

const SECTION_ANCHORS = {
  profile: "profile-details",
  details: "profile-details",
  registrations: "profile-registrations",
  id: "profile-id",
};

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

function goTo(path) {
  const router = document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
  if (router) router.push(path);
  else window.location.href = path;
}

/**
 * Open the profile page, scrolled to a section ("profile" | "registrations" | "id").
 */
export function openProfilePanel(target = "profile") {
  const anchor = SECTION_ANCHORS[target] || SECTION_ANCHORS.profile;
  const onProfile = window.location.pathname.replace(/\/$/, "") === "/profile";
  if (onProfile && page.root?.isConnected) {
    if (target === "registrations") loadRegistrations();
    scrollToSection(anchor);
    return;
  }
  page.pendingAnchor = target === "profile" ? null : anchor;
  goTo("/profile");
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 90;
  const smoother = window.ScrollSmoother?.get?.();
  if (smoother) smoother.scrollTo(top, true);
  else window.scrollTo({ top, behavior: "smooth" });
}

// ----------------------------------------------------------------------------
// PROFILE PAGE
// ----------------------------------------------------------------------------

const page = {
  root: null,
  uid: undefined,
  regs: null,
  regsError: "",
  regsLoading: false,
  pendingAnchor: null,
  confirmDereg: null, // eventId awaiting "Yes, deregister"
  deregBusy: null,
  deregError: null, // { eventId, message }
  unsubAuth: null,
  unsubCart: null,
};

export function renderProfilePageHtml() {
  return `<div class="profile-page-root" id="chaitanya-profile-page"><div class="prof-wrap"><div class="pp-loading">Loading your profile…</div></div></div>`;
}

/**
 * Mount the /profile page into #chaitanya-profile-page. Safe to call twice.
 */
export async function mountProfilePage() {
  const root = document.getElementById("chaitanya-profile-page");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";
  page.root = root;
  page.uid = undefined;
  page.regs = null;
  page.confirmDereg = page.deregBusy = page.deregError = null;

  root.addEventListener("click", onPageClick);
  root.addEventListener("submit", onPageSubmit);
  root.addEventListener("input", onPageInput);

  // Wait for the auth state to be known before deciding what to show.
  await initFirebase();
  if (!root.isConnected) return;

  page.unsubAuth?.();
  page.unsubAuth = subscribeAuthState((user) => {
    if (!root.isConnected) return cleanupPage();
    const uid = user?.uid || null;
    if (uid !== page.uid) {
      page.uid = uid;
      page.regs = null;
      renderPage();
      if (uid) loadRegistrations();
    } else if (user) {
      updateHeader(user);
    }
  });
  page.unsubCart?.();
  page.unsubCart = subscribeCart(() => {
    if (!root.isConnected) return cleanupPage();
    if (page.uid) renderRegistrations();
  });
}

function cleanupPage() {
  page.unsubAuth?.();
  page.unsubCart?.();
  page.unsubAuth = page.unsubCart = null;
  page.root = null;
}

function renderPage() {
  const root = page.root;
  if (!root) return;
  const user = getCurrentUser();
  const wrap = root.querySelector(".prof-wrap");

  if (!user) {
    wrap.innerHTML = `
      <section class="prof-card prof-signed-out">
        <span class="pp-kicker">CHAITANYA 2K26 • PROFILE</span>
        <h1 class="prof-title">Sign in to view your profile</h1>
        <p class="pp-hint">Your profile, event registrations and entry QR codes are available after you sign in.</p>
        <div class="prof-actions">
          <button type="button" class="pp-primary" data-prof="login">[ Login ]</button>
          <button type="button" class="pp-action subtle" data-prof="register">[ Register ]</button>
        </div>
      </section>`;
    refreshScroll();
    return;
  }

  wrap.innerHTML = `
    <div class="prof-card prof-head">
      ${avatarHtml(user, "pp-avatar prof-avatar")}
      <div class="prof-head-text">
        <span class="pp-kicker">CHAITANYA 2K26 • PROFILE</span>
        <h1 class="prof-title" data-prof-name>${e(user.displayName)}</h1>
        <span class="pp-sub">${e(user.email)}</span>
        ${user.studentId ? `<span class="pp-sub">Chaitanya ID <b class="mono">${e(user.studentId)}</b></span>` : ""}
      </div>
      <button type="button" class="pp-logout prof-logout" data-prof="logout">[ Log out ]</button>
    </div>

    <section class="prof-card" id="profile-details" aria-labelledby="prof-details-title">
      <div class="prof-section-head">
        <span class="pp-kicker">01 // YOUR DETAILS</span>
        <h2 class="prof-h2" id="prof-details-title">Profile information</h2>
        <p class="pp-hint">These details are used for your event registrations and entry QR codes.</p>
      </div>
      ${detailsFormHtml(user)}
    </section>

    <section class="prof-card" id="profile-registrations" aria-labelledby="prof-regs-title">
      <div class="prof-section-head">
        <span class="pp-kicker">02 // MY REGISTRATIONS</span>
        <h2 class="prof-h2" id="prof-regs-title">Events &amp; entry QR codes</h2>
        <p class="pp-hint">Each registration has its own QR code with your name, college and event. Show it at the venue.</p>
      </div>
      <div data-prof-regs><div class="pp-loading">Loading your registrations…</div></div>
    </section>

    <section class="prof-card" id="profile-id" aria-labelledby="prof-id-title">
      <div class="prof-section-head">
        <span class="pp-kicker">03 // DIGITAL ID</span>
        <h2 class="prof-h2" id="prof-id-title">Your Digital ID</h2>
      </div>
      <div data-prof-id></div>
    </section>

    <section class="prof-card prof-danger" id="profile-delete" aria-labelledby="prof-delete-title">
      <div class="prof-section-head">
        <h2 class="prof-h2" id="prof-delete-title">Delete profile</h2>
        <p class="pp-hint">Cancels all your free registrations, deletes your profile and Chaitanya ID, and signs you out. You can register again afterwards with a fresh profile.</p>
      </div>
      <div data-prof-delete>
        <button type="button" class="pp-logout prof-delete-open" data-prof="delete-open">Delete my profile…</button>
      </div>
    </section>`;

  renderRegistrations();
  renderDigitalId();
  refreshScroll();
  if (page.pendingAnchor) {
    const anchor = page.pendingAnchor;
    page.pendingAnchor = null;
    setTimeout(() => scrollToSection(anchor), 350);
  }
}

function updateHeader(user) {
  const name = page.root?.querySelector("[data-prof-name]");
  if (name) name.textContent = user.displayName;
  renderDigitalId();
}

function refreshScroll() {
  // ScrollSmoother caches the content height; recompute it after renders.
  requestAnimationFrame(() => {
    try {
      window.ScrollTrigger?.refresh?.();
    } catch (err) {}
  });
}

// ---- Details form -----------------------------------------------------------

function detailsFormHtml(user) {
  return `
    <form class="pp-form prof-form" data-form="profile" novalidate>
      <label class="pp-field"><span>Full name *</span>
        <input type="text" name="displayName" maxlength="120" value="${e(user.displayName)}" autocomplete="name" required />
      </label>
      <label class="pp-field"><span>Email</span>
        <input type="email" name="email" value="${e(user.email)}" readonly aria-readonly="true" />
        <small class="pp-hint">Comes from your Google account and can't be changed here.</small>
      </label>
      <label class="pp-field"><span>College / University *</span>
        <input type="text" name="college" maxlength="120" value="${e(user.college)}" placeholder="e.g. HPTU Hamirpur" autocomplete="organization" required />
      </label>
      <label class="pp-field"><span>Year *</span>
        <select name="year" required>
          <option value="">Select year</option>
          ${YEAR_OPTIONS.map((y) => `<option ${y === user.year ? "selected" : ""}>${e(y)}</option>`).join("")}
        </select>
      </label>
      <label class="pp-field"><span>Contact no (WhatsApp) *</span>
        <input type="tel" name="phone" maxlength="20" value="${e(user.phone)}" placeholder="+91 9XXXX XXXXX" autocomplete="tel" required />
      </label>
      <div class="pp-msg" role="status" aria-live="polite" hidden></div>
      <div class="prof-actions">
        <button type="submit" class="pp-primary">Save changes</button>
      </div>
    </form>`;
}

function validateDetails(form) {
  const name = form.displayName.value.trim();
  const college = form.college.value.trim();
  const year = form.year.value;
  const digits = form.phone.value.replace(/\D/g, "").length;
  if (!name) return ["displayName", "Please enter your name."];
  if (!college) return ["college", "Please enter your college / university."];
  if (!year) return ["year", "Please select your year."];
  if (digits < 10 || digits > 15) return ["phone", "Enter a valid phone number (10 digits, optional country code)."];
  return null;
}

function showFormMessage(form, text, ok) {
  const msg = form.querySelector(".pp-msg");
  msg.textContent = text;
  msg.className = `pp-msg ${ok ? "ok" : "bad"}`;
  msg.hidden = false;
}

// ---- Registrations ----------------------------------------------------------

const STATUS_CHIP = {
  booked: { label: "BOOKED", cls: "ok" },
  pending: { label: "PAYMENT PENDING", cls: "pending" },
  rejected: { label: "PAYMENT NOT VERIFIED", cls: "bad" },
  cart: { label: "NOT REGISTERED YET", cls: "cart" },
};

async function loadRegistrations() {
  if (!getCurrentUser() || page.regsLoading) return;
  page.regsLoading = true;
  page.regsError = "";
  try {
    page.regs = await getMyRegistrations();
  } catch (err) {
    page.regsError = err.message || "Could not load your registrations.";
    page.regs = [];
  }
  page.regsLoading = false;
  renderRegistrations();
  renderDigitalId();
}

/**
 * Entry QR for one registration (structured JSON: name, college, event, pass).
 */
export function registrationQrHtml(registration, { size = "" } = {}) {
  const payload = registrationQrPayload(registration);
  if (!payload) return "";
  let svg = "";
  try {
    svg = qrSvg(payload, { label: `Entry QR for ${registration.event_title}` });
  } catch (err) {
    return "";
  }
  const file = `${registration.registration_qr_id || "chaitanya-entry"}.svg`;
  const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return `
    <figure class="prof-qr ${size}">
      <div class="prof-qr-code">${svg}</div>
      <figcaption>
        <span class="mono">${e(registration.registration_qr_id || "")}</span>
        <a class="pp-action subtle" href="${href}" download="${e(file)}">Download QR</a>
      </figcaption>
    </figure>`;
}

function renderRegistrations() {
  const box = page.root?.querySelector("[data-prof-regs]");
  if (!box) return;
  if (page.regs === null) {
    box.innerHTML = `<div class="pp-loading">Loading your registrations…</div>`;
    return;
  }
  if (page.regsError) {
    box.innerHTML = `<div class="pp-empty"><p>${e(page.regsError)}</p><button type="button" class="pp-action" data-prof="reload-regs">Try again</button></div>`;
    return;
  }

  const regs = page.regs;
  const cart = getCartItems().filter((c) => !regs.some((r) => r.registration.event_id === c.eventId));
  const rows = regs.map(({ registration: r, payment, team, status }) => {
    const ev = getEventById(r.event_id);
    const chip = STATUS_CHIP[status] || STATUS_CHIP.pending;
    const cal = status === "booked" ? googleCalendarLink(ev) : null;
    const isLeader = team && team.leaderUid === r.user_id;
    return `
      <li class="pp-reg prof-reg">
        <div class="prof-reg-info">
          <div class="pp-reg-top">
            <strong>${e(r.event_title)}</strong>
            <span class="pp-chip ${chip.cls}">${chip.label}</span>
          </div>
          ${ev ? `<span class="pp-reg-meta">${e(`${ev.date} · ${ev.time}`)}</span>` : ""}
          <dl class="prof-reg-dl">
            <dt>Name</dt><dd>${e(r.user_name)}</dd>
            <dt>College</dt><dd>${e(r.user_college || "—")}</dd>
            <dt>Type</dt><dd>${r.participation_type === "team" ? "Team" : "Solo"}</dd>
          </dl>
          ${team ? `<span class="pp-reg-meta">Team ${e(team.teamName)}${isLeader ? ` · code <b class="mono">${e(team.teamCode)}</b>` : ""}</span>` : ""}
          <div class="pp-reg-actions">
            ${cal ? `<a class="pp-action" href="${e(cal)}" target="_blank" rel="noopener noreferrer">+ Add to Google Calendar</a>` : ""}
            ${status === "pending" ? `<span class="pp-reg-note">The fest team is verifying your payment.</span>` : ""}
            ${canCancelRegistration(r) && page.confirmDereg !== r.event_id
              ? `<button type="button" class="pp-action subtle prof-dereg" data-prof="dereg-ask" data-event-id="${e(r.event_id)}">Deregister</button>`
              : ""}
          </div>
          ${!canCancelRegistration(r) ? `<span class="pp-reg-note">Paid registration: contact the fest team to cancel it.</span>` : ""}
          ${page.confirmDereg === r.event_id ? deregConfirmHtml(r, team) : ""}
          ${page.deregError?.eventId === r.event_id ? `<p class="pp-msg bad" role="alert">${e(page.deregError.message)}</p>` : ""}
          ${status === "rejected" && payment ? `
            <form class="pp-utr" data-form="utr" data-payment="${e(payment.paymentId)}" novalidate>
              <span class="pp-reg-note">${e(payment.rejectionReason || "We couldn't match your UTR.")}</span>
              <input type="text" name="utr" inputmode="numeric" maxlength="12" placeholder="Correct 12-digit UTR" aria-label="Correct 12-digit UTR" />
              <button type="submit" class="pp-action">Resubmit</button>
            </form>` : ""}
        </div>
        ${registrationQrHtml(r)}
      </li>`;
  });

  const cartRows = cart.map(
    (c) => `
      <li class="pp-reg prof-reg">
        <div class="prof-reg-info">
          <div class="pp-reg-top">
            <strong>${e(c.event.title)}</strong>
            <span class="pp-chip cart">${STATUS_CHIP.cart.label}</span>
          </div>
          <span class="pp-reg-meta">${e(`${c.event.date} · ${c.event.time}`)}</span>
          <div class="pp-reg-actions">
            <button type="button" class="pp-action" data-prof="checkout">Complete registration →</button>
            <button type="button" class="pp-action subtle" data-prof="cart-remove" data-event-id="${e(c.eventId)}">Remove</button>
          </div>
        </div>
      </li>`
  );

  box.innerHTML =
    rows.length || cartRows.length
      ? `<ul class="pp-regs prof-regs">${rows.join("")}${cartRows.join("")}</ul>`
      : `<div class="pp-empty">
           <p>No registrations yet.</p>
           <a class="pp-primary" href="/events" data-prof="browse">Browse events</a>
         </div>`;
  refreshScroll();
}

function deregConfirmHtml(r, team) {
  const busy = page.deregBusy === r.event_id;
  const isLeader = team && team.leaderUid === r.user_id;
  const note = isLeader
    ? `Your team ${e(team.teamName)} and its code will be removed.`
    : team
      ? `You'll be removed from team ${e(team.teamName)}.`
      : "";
  return `
    <div class="prof-confirm" role="group" aria-label="Confirm deregistration">
      <p><strong>Deregister from ${e(r.event_title)}?</strong> ${["Your entry QR for this event stops working.", note, "You can register again while registration is open."].filter(Boolean).join(" ")}</p>
      <div class="prof-actions">
        <button type="button" class="pp-logout prof-confirm-yes" data-prof="dereg-yes" data-event-id="${e(r.event_id)}" ${busy ? "disabled" : ""}>${busy ? "Deregistering…" : `Yes, deregister`}</button>
        <button type="button" class="pp-action subtle" data-prof="dereg-cancel" ${busy ? "disabled" : ""}>Keep registration</button>
      </div>
    </div>`;
}

function renderDeleteConfirm(open) {
  const box = page.root?.querySelector("[data-prof-delete]");
  const user = getCurrentUser();
  if (!box || !user) return;
  if (!open) {
    box.innerHTML = `<button type="button" class="pp-logout prof-delete-open" data-prof="delete-open">Delete my profile…</button>`;
    return;
  }
  box.innerHTML = `
    <form class="pp-form prof-confirm" data-form="delete-profile" novalidate>
      <label class="pp-field"><span>Type your email to confirm</span>
        <input type="email" name="confirmEmail" autocomplete="off" placeholder="${e(user.email)}" />
      </label>
      <div class="pp-msg" role="alert" hidden></div>
      <div class="prof-actions">
        <button type="submit" class="pp-logout prof-confirm-yes" disabled>Delete profile permanently</button>
        <button type="button" class="pp-action subtle" data-prof="delete-cancel">Cancel</button>
      </div>
    </form>`;
  box.querySelector("input").focus();
  refreshScroll();
}

// ---- Digital ID -------------------------------------------------------------

function verifyUrl(studentId) {
  return `${window.location.origin}/?verify=${encodeURIComponent(studentId)}`;
}

function renderDigitalId() {
  const box = page.root?.querySelector("[data-prof-id]");
  const user = getCurrentUser();
  if (!box || !user) return;
  const regs = page.regs || [];
  const booked = regs.filter((r) => r.status === "booked").length;
  const pending = regs.filter((r) => r.status === "pending").length;
  const state = booked ? "verified" : pending ? "pending" : "none";
  const stateLabel = {
    verified: `✓ VERIFIED PARTICIPANT · ${booked} EVENT${booked > 1 ? "S" : ""}`,
    pending: "⏳ PAYMENT VERIFICATION PENDING",
    none: "NOT REGISTERED FOR ANY EVENT YET",
  }[state];
  const incomplete = !user.college || !user.year;

  box.innerHTML = `
    <article class="pp-idcard prof-idcard ${state}">
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
    ${incomplete ? `<p class="pp-hint">Add your college and year in <a class="pp-inline" href="#profile-details" data-prof="goto" data-target="profile-details">Profile information</a> so they appear on your ID.</p>` : ""}
    <p class="pp-hint">Organisers scan this QR to see all your registrations at once.</p>`;
}

// ---- Page events ------------------------------------------------------------

async function onPageClick(evt) {
  const btn = evt.target.closest("[data-prof]");
  if (!btn) return;
  const action = btn.dataset.prof;
  if (action === "login" || action === "register") {
    return window.openAuthModal?.(action);
  }
  if (action === "logout") {
    btn.disabled = true;
    await signOutUser();
    goTo("/");
    return;
  }
  if (action === "reload-regs") {
    page.regs = null;
    renderRegistrations();
    return loadRegistrations();
  }
  if (action === "checkout") {
    goTo("/events?cart=1");
    return;
  }
  if (action === "cart-remove") {
    removeFromCart(btn.dataset.eventId);
    return renderRegistrations();
  }
  if (action === "browse") {
    evt.preventDefault();
    goTo("/events");
    return;
  }
  if (action === "goto") {
    evt.preventDefault();
    scrollToSection(btn.dataset.target);
  }
  if (action === "dereg-ask") {
    page.confirmDereg = btn.dataset.eventId;
    page.deregError = null;
    return renderRegistrations();
  }
  if (action === "dereg-cancel") {
    page.confirmDereg = null;
    return renderRegistrations();
  }
  if (action === "dereg-yes") {
    const eventId = btn.dataset.eventId;
    page.deregBusy = eventId;
    renderRegistrations();
    try {
      await cancelRegistration(eventId);
      page.confirmDereg = null;
      page.deregError = null;
      page.deregBusy = null;
      page.regs = null;
      renderRegistrations();
      return loadRegistrations();
    } catch (err) {
      page.deregBusy = null;
      page.deregError = { eventId, message: err.message || "Could not cancel the registration." };
      return renderRegistrations();
    }
  }
  if (action === "delete-open") return renderDeleteConfirm(true);
  if (action === "delete-cancel") return renderDeleteConfirm(false);
}

function onPageInput(evt) {
  const input = evt.target;
  if (input.name === "confirmEmail") {
    const user = getCurrentUser();
    const ok = Boolean(user) && input.value.trim().toLowerCase() === String(user.email).toLowerCase();
    input.form.querySelector("button[type=submit]").disabled = !ok;
    return;
  }
  // Clear a field's error as soon as the user edits it.
  if (input.getAttribute?.("aria-invalid") === "true") {
    input.removeAttribute("aria-invalid");
    const msg = input.form?.querySelector(".pp-msg");
    if (msg && msg.classList.contains("bad")) msg.hidden = true;
  }
}

async function onPageSubmit(evt) {
  const form = evt.target.closest("form[data-form]");
  if (!form) return;
  evt.preventDefault();

  if (form.dataset.form === "profile") {
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    const invalid = validateDetails(form);
    if (invalid) {
      const [field, text] = invalid;
      form[field].setAttribute("aria-invalid", "true");
      form[field].focus();
      return showFormMessage(form, text, false);
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      await updateMyProfile({
        displayName: form.displayName.value,
        college: form.college.value,
        year: form.year.value,
        phone: form.phone.value,
      });
      showFormMessage(form, "✓ Profile saved.", true);
    } catch (err) {
      showFormMessage(form, err.message || "Could not save your profile.", false);
    }
    btn.disabled = false;
    btn.textContent = "Save changes";
  }

  if (form.dataset.form === "delete-profile") {
    const user = getCurrentUser();
    const btn = form.querySelector("button[type=submit]");
    if (!user || form.confirmEmail.value.trim().toLowerCase() !== String(user.email).toLowerCase()) return;
    btn.disabled = true;
    btn.textContent = "Deleting…";
    try {
      await deleteMyProfile();
      goTo("/");
      setTimeout(() => window.openAuthModal?.("register"), 400);
    } catch (err) {
      showFormMessage(form, err.message || "Could not delete your profile.", false);
      btn.disabled = false;
      btn.textContent = "Delete profile permanently";
      page.regs = null;
      loadRegistrations();
    }
    return;
  }

  if (form.dataset.form === "utr") {
    const input = form.utr;
    try {
      await resubmitPaymentUtr(form.dataset.payment, input.value.replace(/\D/g, ""));
      page.regs = null;
      renderRegistrations();
      loadRegistrations();
    } catch (err) {
      input.setCustomValidity(err.message);
      input.reportValidity();
      setTimeout(() => input.setCustomValidity(""), 3000);
    }
  }
}

// ----------------------------------------------------------------------------
// ORGANISER VERIFY OVERLAY (/?verify=CH26-XXXXXXXX)
// ----------------------------------------------------------------------------

let root = null;
let open = false;
let verifyId = null;
let lastFocus = null;

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
 * #__nuxt is inert while this overlay or the sign-in dialog is open (same
 * logic as auth-modal.js). Only an inert set by these dialogs is removed.
 */
function syncAppInert() {
  const app = document.getElementById("__nuxt");
  if (!app) return;
  const anyOpen = document.querySelector("#chaitanya-auth-backdrop.active, #profile-overlay.active");
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

/** The sign-in dialog opened from this overlay sits on top and owns the keyboard. */
const authDialogOnTop = () => Boolean(document.querySelector("#chaitanya-auth-backdrop.active"));

function ensureRoot() {
  if (root && document.body.contains(root)) return root;
  root = document.createElement("div");
  root.id = "profile-overlay";
  root.className = "pp-overlay";
  root.innerHTML = `<section class="pp-panel" role="dialog" aria-modal="true" aria-labelledby="pp-title" tabindex="-1"></section>`;
  root.inert = true; // closed: nothing inside is focusable
  document.body.appendChild(root);

  root.addEventListener("mousedown", (evt) => {
    if (evt.target === root) closeProfilePanel();
  });
  root.addEventListener("click", (evt) => {
    const btn = evt.target.closest("[data-pp]");
    if (!btn) return;
    if (btn.dataset.pp === "close") closeProfilePanel();
    if (btn.dataset.pp === "verify-login") window.openAuthModal?.("login");
  });
  document.addEventListener("keydown", (evt) => {
    if (!open || authDialogOnTop()) return;
    if (evt.key === "Escape" && !evt.defaultPrevented) {
      evt.preventDefault(); // tells other Escape handlers this press was used
      closeProfilePanel();
    } else if (evt.key === "Tab") {
      trapTab(evt, root.querySelector(".pp-panel"));
    }
  });
  return root;
}

export function closeProfilePanel() {
  if (!root || !open) return;
  open = false;
  root.classList.remove("active");
  root.inert = true;
  syncAppInert();
  document.documentElement.classList.remove("pp-open");
  if (verifyId) {
    verifyId = null;
    const url = new URL(window.location.href);
    url.searchParams.delete("verify");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  const target = lastFocus;
  lastFocus = null;
  if (target?.isConnected) target.focus?.({ preventScroll: true });
}

function renderVerifyOverlay() {
  const panel = root.querySelector(".pp-panel");
  // Re-rendering (e.g. after signing in) would drop focus on <body>.
  const hadFocus = open && panel.contains(document.activeElement);
  panel.innerHTML = `
    <header class="pp-head">
      <div class="pp-head-text"><span class="pp-kicker">CHAITANYA 2K26</span><h2 id="pp-title" class="pp-title">ID VERIFICATION</h2></div>
      <button type="button" class="pp-close" data-pp="close" aria-label="Close"><span aria-hidden="true">✕</span></button>
    </header>
    <div class="pp-body" id="pp-body" aria-live="polite"><div class="pp-loading">Checking ID…</div></div>`;
  if (hadFocus) panel.focus({ preventScroll: true });
  renderVerify(panel.querySelector("#pp-body"));
}

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
  if (!open) lastFocus = document.activeElement;
  ensureRoot();
  renderVerifyOverlay();
  open = true;
  root.inert = false;
  document.documentElement.classList.add("pp-open");
  requestAnimationFrame(() => {
    if (!open) return; // closed again before the first frame
    root.classList.add("active");
    syncAppInert();
    // Move focus into the dialog; it is labelled by the visible #pp-title.
    root.querySelector(".pp-panel")?.focus({ preventScroll: true });
  });
}

// ----------------------------------------------------------------------------
// BOOT
// ----------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.openProfilePanel = openProfilePanel;
  window.closeProfilePanel = closeProfilePanel;
  window.mountProfilePage = mountProfilePage;

  subscribeAuthState(() => {
    if (open && verifyId) renderVerifyOverlay();
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("verify")) {
    const id = params.get("verify");
    const start = () => openVerifyView(id);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else setTimeout(start, 0);
  }
}
