/**
 * ============================================================================
 * Chaitanya 2k26 — Admin dashboard (/admin)
 * ============================================================================
 * Full-page organiser dashboard. Sections (sidebar):
 *   Overview · Check-in · Payments · Registrations · Teams · Accounts ·
 *   Queries · Setup (· Dev cache on the local Python server)
 * Access is enforced by firestore.rules; the email check here only decides
 * what UI to show.
 */

import {
  initFirebase,
  getCurrentUser,
  subscribeAuthState,
  getRegisteredAttendees,
  getAllTeams,
  getAllPayments,
  getAllRegistrations,
  getAllQueries,
  setQueryStatus,
  paymentItems,
  approvePayment,
  rejectPayment,
  backfillTeamCodes,
  adminSetField,
  adminDeleteDoc,
  passId,
  legacyPassId,
  paymentCovers,
  teamCovers,
} from "./auth-service.js";
import { isAdminUser } from "./firebase-config.js";
import { applySchemaToFirestore } from "./firebase-schema-seeder.js";
import { EVENTS_DATA, ACCOMMODATION, getEventById } from "./events-data.js";
import { FEST_CONFIG, escapeHtml as e } from "./fest-config.js";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "checkin", label: "Check-in" },
  { id: "payments", label: "Payments" },
  { id: "registrations", label: "Registrations" },
  { id: "teams", label: "Teams" },
  { id: "attendees", label: "Accounts" },
  { id: "queries", label: "Queries" },
  { id: "setup", label: "Setup" },
  { id: "security", label: "Security" },
];

const state = {
  root: null,
  uid: undefined,
  section: "overview",
  search: "",
  eventFilter: "all",
  statusFilter: "all",
  loading: false,
  loadedAt: null,
  attendees: [],
  teams: [],
  payments: [],
  registrations: [],
  queries: [],
  errors: [],
  devServer: false,
  checkin: null, // { query, results }
  scan: null, // { hits, at } from scanSuspicious()
  rejecting: null, // paymentId whose inline "reject reason" form is open
  actionError: "",
  unsubAuth: null,
};

// ----------------------------------------------------------------------------
// MOUNT
// ----------------------------------------------------------------------------

export function renderAdminPageHtml() {
  // #adm-live sits outside .adm-shell so re-renders never replace it: screen
  // readers only announce changes to a live region that already exists.
  return `<div class="admin-page-root" id="chaitanya-admin-page"><div class="adm-shell"><div class="pp-loading">Loading dashboard…</div></div><div class="sr-only" id="adm-live" role="status" aria-live="polite"></div></div>`;
}

export async function mountAdminPage() {
  const root = document.getElementById("chaitanya-admin-page");
  if (!root || root.dataset.bound === "1") return;
  root.dataset.bound = "1";
  state.root = root;
  state.uid = undefined;

  const hash = window.location.hash.replace("#", "");
  if (SECTIONS.some((s) => s.id === hash)) state.section = hash;

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onInput);
  root.addEventListener("submit", onSubmit);

  await initFirebase();
  if (!root.isConnected) return;

  state.unsubAuth?.();
  state.unsubAuth = subscribeAuthState((user) => {
    if (!root.isConnected) {
      state.unsubAuth?.();
      state.unsubAuth = null;
      return;
    }
    const uid = user?.uid || null;
    if (uid === state.uid) return;
    state.uid = uid;
    if (user && isAdminUser(user.email)) {
      renderShell();
      loadData();
    } else {
      renderGate(user);
    }
  });
}

/** Announce a short message through the persistent #adm-live region. */
function announce(text) {
  const live = state.root?.querySelector("#adm-live");
  if (!live) return;
  live.textContent = "";
  setTimeout(() => (live.textContent = text), 60);
}

function shell() {
  return state.root?.querySelector(".adm-shell");
}

function refreshScroll() {
  requestAnimationFrame(() => {
    try {
      window.ScrollTrigger?.refresh?.();
    } catch (err) {}
  });
}

function goTo(path) {
  const router = document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
  if (router) router.push(path);
  else window.location.href = path;
}

// ----------------------------------------------------------------------------
// ACCESS GATE
// ----------------------------------------------------------------------------

function renderGate(user) {
  const box = shell();
  if (!box) return;
  box.innerHTML = user
    ? `
      <section class="prof-card adm-gate">
        <span class="pp-kicker">403 • ACCESS RESTRICTED</span>
        <h1 class="prof-title">Organisers only</h1>
        <p class="pp-hint">${e(user.email)} isn't a fest organiser account. Sign in with an organiser Google account to open the dashboard.</p>
        <div class="prof-actions"><a class="pp-primary" href="/profile" data-adm="nav" data-path="/profile">Go to my profile</a></div>
      </section>`
    : `
      <section class="prof-card adm-gate">
        <span class="pp-kicker">CHAITANYA 2K26 • ADMIN</span>
        <h1 class="prof-title">Fest Command Center</h1>
        <p class="pp-hint">Sign in with an authorised organiser Google account.</p>
        <div class="prof-actions"><button type="button" class="pp-primary" data-adm="login">Sign in</button></div>
      </section>`;
  refreshScroll();
}

// ----------------------------------------------------------------------------
// DATA
// ----------------------------------------------------------------------------

async function loadData() {
  state.loading = true;
  renderMain();
  const keys = ["attendees", "teams", "payments", "registrations", "queries"];
  const results = await Promise.allSettled([
    getRegisteredAttendees(),
    getAllTeams(),
    getAllPayments(),
    getAllRegistrations(),
    getAllQueries(),
  ]);
  state.errors = [];
  keys.forEach((key, i) => {
    const r = results[i];
    if (r.status === "fulfilled") state[key] = r.value || [];
    else {
      state[key] = [];
      state.errors.push(`${key}: ${r.reason?.message || r.reason}`);
    }
  });
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    state.devServer = res.ok && (res.headers.get("content-type") || "").includes("json");
  } catch {
    state.devServer = false;
  }
  state.loading = false;
  state.loadedAt = new Date();
  runScan();
  renderShell();
}

function eventFee(eventId) {
  const ev = getEventById(eventId);
  return ev ? Number(ev.entryFeeNum) || 0 : 0;
}

// Effective payment status per registration (free, verified, team leader's
// payment for members, or unpaid).
function computeData() {
  const paymentsById = new Map(state.payments.map((p) => [p.paymentId, p]));
  const teamsById = new Map(state.teams.map((t) => [t.teamId, t]));
  const utrCounts = new Map();
  state.payments.forEach((p) => {
    if (p.transactionRef) utrCounts.set(p.transactionRef, (utrCounts.get(p.transactionRef) || 0) + 1);
  });
  const regRows = state.registrations.map((r) => {
    const fee = eventFee(r.event_id);
    let payStatus;
    if (r.participation_type === "team" && r.team_role === "member") {
      // Only the leader's payment for this team's own event counts for a linked member.
      const team = teamsById.get(r.team_id);
      const leaderPay = teamCovers(team, r) && team.paymentId ? paymentsById.get(team.paymentId) : null;
      payStatus = fee === 0 ? "free" : (paymentCovers(leaderPay, r.event_id, team?.leaderUid) && leaderPay.status) || "unpaid";
    } else if (fee === 0) {
      payStatus = "free";
    } else {
      const pay = paymentsById.get(r.payment_id);
      payStatus = (paymentCovers(pay, r.event_id, r.user_id) && pay.status) || "unpaid";
    }
    return { ...r, fee, payStatus, team: teamsById.get(r.team_id) || null };
  });
  const leaderContact = new Map(
    state.registrations.filter((r) => r.team_role === "leader").map((r) => [r.team_id, { email: r.user_email, phone: r.user_phone }])
  );
  return { regRows, utrCounts, leaderContact };
}

// ----------------------------------------------------------------------------
// RENDERING
// ----------------------------------------------------------------------------

const STATUS_LABEL = {
  pending_verification: "PENDING",
  verified: "VERIFIED",
  rejected: "REJECTED",
  free: "FREE",
  team: "TEAM",
  unpaid: "UNPAID",
  paid: "PAID",
  pending: "PENDING",
  open: "OPEN",
  resolved: "RESOLVED",
};

function statusBadge(status) {
  const s = status || "pending_verification";
  const cls = s.includes("pending") || s === "open" ? "pending" : s === "unpaid" ? "rejected" : s === "resolved" ? "verified" : s;
  return `<span class="badge-status ${e(cls)}">${e(STATUS_LABEL[s] || String(s).toUpperCase())}</span>`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value?.toDate ? value.toDate() : value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function sectionCount(id, data) {
  switch (id) {
    case "payments":
      return state.payments.filter((p) => p.status === "pending_verification").length || "";
    case "registrations":
      return data.regRows.length;
    case "teams":
      return state.teams.length;
    case "attendees":
      return state.attendees.length;
    case "queries":
      return state.queries.filter((q) => q.status !== "resolved").length || "";
    case "security":
      return state.scan?.hits.length || "";
    default:
      return "";
  }
}

function renderShell() {
  const box = shell();
  const user = getCurrentUser();
  if (!box || !user) return;
  const data = computeData();
  const sections = [...SECTIONS, ...(state.devServer ? [{ id: "redis", label: "Dev cache" }] : [])];
  const alertIds = new Set(["payments", "queries", "security"]);
  // Re-rendering replaces every control; remember which top-bar/sidebar
  // button had focus so keyboard users are not dropped back to <body>.
  const focused = document.activeElement?.closest?.(".adm-top [data-adm], .adm-nav [data-adm]");
  const refocus = focused && box.contains(focused)
    ? `[data-adm="${focused.dataset.adm}"]${focused.dataset.section ? `[data-section="${focused.dataset.section}"]` : ""}`
    : "";

  box.innerHTML = `
    <div class="adm-top">
      <div>
        <span class="pp-kicker">CHAITANYA 2K26 • ADMIN</span>
        <h1 class="prof-title">Fest Command Center</h1>
        <p class="pp-hint">Signed in as ${e(user.email)}${state.loadedAt ? ` · data loaded ${e(state.loadedAt.toLocaleTimeString("en-IN", { timeStyle: "short" }))}` : ""}</p>
      </div>
      <div class="adm-top-actions">
        <button type="button" class="pp-action subtle" data-adm="reload">${state.loading ? "Loading…" : "↻ Reload data"}</button>
        <button type="button" class="pp-action" data-adm="excel">⬇ Excel (all sheets)</button>
      </div>
    </div>
    <div class="adm-layout">
      <nav class="adm-nav" aria-label="Dashboard sections">
        ${sections
          .map((s) => {
            const count = sectionCount(s.id, data);
            return `<button type="button" class="adm-nav-btn ${state.section === s.id ? "active" : ""}" data-adm="section" data-section="${s.id}" aria-current="${state.section === s.id ? "page" : "false"}">
              <span>${e(s.label)}</span>${count !== "" ? `<span class="adm-count ${alertIds.has(s.id) && count ? "alert" : ""}">${e(count)}</span>` : ""}
            </button>`;
          })
          .join("")}
      </nav>
      <main class="adm-main" id="adm-main"></main>
    </div>`;
  renderMain();
  if (refocus) box.querySelector(refocus)?.focus();
}

function renderMain() {
  const main = state.root?.querySelector("#adm-main");
  if (!main) return;
  if (state.loading && !state.loadedAt) {
    main.innerHTML = `<div class="pp-loading">Loading fest database…</div>`;
    return;
  }
  const data = computeData();
  const errors = state.errors.length
    ? `<div class="chaitanya-modal-banner danger" role="alert"><div><strong>Some data failed to load:</strong> ${e(state.errors.join(" · "))}</div></div>`
    : "";
  const render = {
    overview: renderOverview,
    checkin: renderCheckin,
    payments: renderPayments,
    registrations: renderRegistrations,
    teams: renderTeams,
    attendees: renderAttendees,
    queries: renderQueries,
    setup: renderSetup,
    security: renderSecurity,
    redis: renderRedis,
  }[state.section] || renderOverview;
  const actionError = state.actionError
    ? `<div class="chaitanya-modal-banner danger" role="alert"><div>${e(state.actionError)}</div></div>`
    : "";
  main.innerHTML = errors + actionError + render(data);
  if (state.section === "redis") loadRedisStats(main);
  refreshScroll();
}

function rerenderTable() {
  // Re-render only the results so the search box keeps focus while typing.
  const main = state.root?.querySelector("#adm-main");
  const results = main?.querySelector("[data-adm-results]");
  if (!results) return renderMain();
  const tmp = document.createElement("div");
  const render = {
    payments: renderPayments,
    registrations: renderRegistrations,
    teams: renderTeams,
    attendees: renderAttendees,
    queries: renderQueries,
  }[state.section];
  if (!render) return;
  tmp.innerHTML = render(computeData());
  const fresh = tmp.querySelector("[data-adm-results]");
  if (fresh) results.replaceWith(fresh);
}

const stat = (num, label, { alert = false, hint = "" } = {}) => `
  <div class="adm-stat ${alert ? "alert" : ""}">
    <div class="adm-stat-num">${e(num)}</div>
    <div class="adm-stat-label">${e(label)}</div>
    ${hint ? `<div class="adm-stat-hint">${e(hint)}</div>` : ""}
  </div>`;

function sectionHead(kicker, title, sub = "") {
  return `<div class="prof-section-head"><span class="pp-kicker">${e(kicker)}</span><h2 class="prof-h2">${e(title)}</h2>${sub ? `<p class="pp-hint">${sub}</p>` : ""}</div>`;
}

function toolbar({ events = false, statuses = null, placeholder = "Search name, email, college, code…" } = {}) {
  return `
    <div class="adm-toolbar">
      <label class="adm-search"><span class="sr-only">Search</span>
        <input type="search" data-adm-filter="search" value="${e(state.search)}" placeholder="${e(placeholder)}" autocomplete="off" />
      </label>
      ${events ? `<label class="adm-select"><span class="sr-only">Event</span><select data-adm-filter="event">
        <option value="all">All events</option>
        ${[...EVENTS_DATA, ACCOMMODATION].map((ev) => `<option value="${e(ev.id)}" ${state.eventFilter === ev.id ? "selected" : ""}>${e(ev.title)}</option>`).join("")}
      </select></label>` : ""}
      ${statuses ? `<label class="adm-select"><span class="sr-only">Status</span><select data-adm-filter="status">
        <option value="all">All statuses</option>
        ${statuses.map((s) => `<option value="${e(s)}" ${state.statusFilter === s ? "selected" : ""}>${e(STATUS_LABEL[s] || s)}</option>`).join("")}
      </select></label>` : ""}
      <button type="button" class="pp-action subtle" data-adm="csv">⬇ CSV</button>
    </div>`;
}

function matchesSearch(...values) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? "").toLowerCase().includes(q));
}

// Toolbar filters per section, shared by the tables and the CSV export.
const keepPayment = (p) =>
  (state.statusFilter === "all" || p.status === state.statusFilter) &&
  matchesSearch(p.payerName, p.payerEmail, p.payerPhone, p.transactionRef, ...paymentItems(p).map((i) => i.eventTitle));
const keepRegistration = (r) =>
  (state.eventFilter === "all" || r.event_id === state.eventFilter) &&
  (state.statusFilter === "all" || r.payStatus === state.statusFilter) &&
  matchesSearch(r.user_name, r.user_email, r.user_phone, r.user_college, r.team_code, r.registration_qr_id, r.student_id, r.event_title);
const keepTeam = (t) =>
  (state.eventFilter === "all" || t.eventId === state.eventFilter) &&
  matchesSearch(t.teamName, t.teamCode, t.leaderName, t.eventName, ...(t.members || []).map((m) => m.name));
const keepAttendee = (a) => matchesSearch(a.displayName, a.name, a.email, a.college, a.phone, a.studentId);
const keepQuery = (q) =>
  (state.statusFilter === "all" || (q.status || "open") === state.statusFilter) &&
  matchesSearch(q.name, q.email, q.phone, q.subject, q.message, q.team_name);

function table(headers, rows, emptyText, total) {
  const label = `${SECTIONS.find((s) => s.id === state.section)?.label || "Results"} table`;
  // The wrapper scrolls sideways on narrow screens, so it is a focusable,
  // named region (keyboard users can scroll it even when no row has a button).
  return `
    <div data-adm-results>
      <p class="adm-result-count">${rows.length} of ${total} shown</p>
      <div class="admin-table-wrap" role="region" tabindex="0" aria-label="${e(label)}">
        <table class="admin-table">
          <caption class="sr-only">${e(label)}, ${rows.length} of ${total} shown</caption>
          <thead><tr>${headers.map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("") || `<tr><td colspan="${headers.length}" class="adm-empty">${e(emptyText)}</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

// ---- Overview ---------------------------------------------------------------

function renderOverview({ regRows }) {
  const pending = state.payments.filter((p) => p.status === "pending_verification");
  const verifiedTotal = state.payments.filter((p) => p.status === "verified").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const participants = new Set(regRows.map((r) => r.user_id));
  const colleges = new Map();
  regRows.forEach((r) => {
    const name = (r.user_college || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    const entry = colleges.get(key) || { name, users: new Set() };
    entry.users.add(r.user_id);
    colleges.set(key, entry);
  });
  const unpaid = regRows.filter((r) => r.payStatus === "unpaid" || r.payStatus === "rejected");
  const smallTeams = state.teams.filter((t) => (t.teamSize || 1) < (t.minTeamSize || 1));
  const openQueries = state.queries.filter((q) => q.status !== "resolved");

  const perEvent = [...EVENTS_DATA, ACCOMMODATION].map((ev) => {
    const regs = regRows.filter((r) => r.event_id === ev.id);
    return { ev, total: regs.length, teams: state.teams.filter((t) => t.eventId === ev.id).length };
  }).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...perEvent.map((p) => p.total));

  const latest = [...regRows].sort((a, b) => String(b.registered_at).localeCompare(String(a.registered_at))).slice(0, 8);
  const topColleges = [...colleges.values()].sort((a, b) => b.users.size - a.users.size).slice(0, 8);

  const attention = [
    pending.length && { text: `${pending.length} payment${pending.length > 1 ? "s" : ""} waiting for verification`, section: "payments" },
    unpaid.length && { text: `${unpaid.length} registration${unpaid.length > 1 ? "s" : ""} for paid events without a verified payment`, section: "registrations" },
    smallTeams.length && { text: `${smallTeams.length} team${smallTeams.length > 1 ? "s" : ""} below the minimum size`, section: "teams" },
    openQueries.length && { text: `${openQueries.length} unanswered contact quer${openQueries.length > 1 ? "ies" : "y"}`, section: "queries" },
  ].filter(Boolean);

  return `
    ${sectionHead("01 // OVERVIEW", "At a glance")}
    <div class="adm-stats">
      ${stat(state.attendees.length, "Accounts")}
      ${stat(regRows.length, "Registrations", { hint: `${participants.size} unique participants` })}
      ${stat(state.teams.length, "Teams")}
      ${stat(colleges.size, "Colleges")}
      ${stat(pending.length, "Payments pending", { alert: pending.length > 0 })}
      ${stat(`₹${verifiedTotal.toLocaleString("en-IN")}`, "Verified collections")}
    </div>

    <section class="adm-card">
      <h3 class="adm-h3">Needs attention</h3>
      ${attention.length
        ? `<ul class="adm-attention">${attention.map((a) => `<li><span>${e(a.text)}</span><button type="button" class="pp-action subtle" data-adm="section" data-section="${a.section}">Open →</button></li>`).join("")}</ul>`
        : `<p class="pp-hint">✓ Nothing waiting. All payments, teams and queries are handled.</p>`}
    </section>

    <section class="adm-card">
      <h3 class="adm-h3">Registrations by event</h3>
      <ul class="adm-bars">
        ${perEvent
          .map(
            ({ ev, total, teams }) => `
          <li>
            <button type="button" class="adm-bar-row" data-adm="event-drill" data-event-id="${e(ev.id)}">
              <span class="adm-bar-label">${e(ev.title)}</span>
              <span class="adm-bar-track"><span class="adm-bar-fill" style="width:${Math.round((total / max) * 100)}%"></span></span>
              <span class="adm-bar-value">${total}${teams ? ` <small>· ${teams} team${teams > 1 ? "s" : ""}</small>` : ""}</span>
            </button>
          </li>`
          )
          .join("")}
      </ul>
    </section>

    <div class="adm-two">
      <section class="adm-card">
        <h3 class="adm-h3">Top colleges</h3>
        ${topColleges.length
          ? `<ol class="adm-list">${topColleges.map((c) => `<li><span>${e(c.name)}</span><strong>${c.users.size}</strong></li>`).join("")}</ol>`
          : `<p class="pp-hint">No registrations yet.</p>`}
      </section>
      <section class="adm-card">
        <h3 class="adm-h3">Latest registrations</h3>
        ${latest.length
          ? `<ul class="adm-list">${latest.map((r) => `<li><span>${e(r.user_name)} <small>· ${e(r.event_title)}</small></span><small>${e(formatDate(r.registered_at))}</small></li>`).join("")}</ul>`
          : `<p class="pp-hint">No registrations yet.</p>`}
      </section>
    </div>`;
}

// ---- Check-in ---------------------------------------------------------------

function parseCheckinInput(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    const obj = JSON.parse(text);
    if (obj && obj.pass) return { pass: String(obj.pass).toUpperCase() };
  } catch {}
  const verify = text.match(/[?&]verify=([A-Z0-9-]+)/i);
  if (verify) return { studentId: verify[1].toUpperCase() };
  const up = text.toUpperCase();
  if (/^CH26-[A-Z2-9]{8}$/.test(up)) return { studentId: up };
  if (/^CH26-([A-Z0-9]{4}-\d{7}|[A-Z0-9]{1,4}-\d{5})$/.test(up)) return { pass: up };
  return { text: text.toLowerCase() };
}

function renderCheckin({ regRows }) {
  const c = state.checkin;
  let results = "";
  if (c) {
    const q = parseCheckinInput(c.query);
    let matches = [];
    // Only trust a pass ID that matches the one derived from the registration's own event + user;
    // registration_qr_id is client-written, so a copied ID on another booking must not match.
    if (q?.pass) matches = regRows.filter((r) => [passId(r.event_id, r.user_id), legacyPassId(r.event_id, r.user_id)].includes(q.pass));
    else if (q?.studentId) matches = regRows.filter((r) => String(r.student_id || "").toUpperCase() === q.studentId);
    else if (q?.text) matches = regRows.filter((r) => [r.user_name, r.user_email, r.user_phone].some((v) => String(v || "").toLowerCase().includes(q.text)));
    results = matches.length
      ? `<ul class="adm-checkin-results">${matches
          .map((r) => {
            const ok = ["free", "verified", "paid", "team"].includes(r.payStatus);
            return `
          <li class="adm-checkin ${ok ? "ok" : "bad"}">
            <div class="adm-checkin-verdict"><span aria-hidden="true">${ok ? "✓" : "✕"}</span> ${ok ? "ADMIT" : "DO NOT ADMIT"}</div>
            <div class="adm-checkin-body">
              <strong>${e(r.user_name)}</strong>
              <span>${e(r.user_college || "—")} · ${e(r.user_year || "")}</span>
              <span><b>${e(r.event_title)}</b>${r.team ? ` · Team ${e(r.team.teamName)} (${e(r.team_role || "member")})` : " · Solo"}</span>
              <span class="mono">${e(r.registration_qr_id)}</span>
            </div>
            ${statusBadge(r.payStatus)}
          </li>`;
          })
          .join("")}</ul>`
      : `<div class="pp-verify bad"><strong>✕ NOT FOUND</strong><p>No registration matches “${e(c.query)}”.</p></div>`;
  }
  return `
    ${sectionHead("02 // CHECK-IN", "Venue check-in", "Scan a participant's entry QR (most scanner apps paste the text), or type a pass ID (CH26-XXXX-0000000), Chaitanya ID (CH26-XXXXXXXX), name, email or phone.")}
    <form class="adm-checkin-form" data-adm-form="checkin" novalidate>
      <input type="text" name="q" value="${e(c?.query || "")}" placeholder="Paste QR text or type an ID / name" autocomplete="off" aria-label="Pass ID, Chaitanya ID, QR text, name, email or phone" />
      <button type="submit" class="pp-primary">Look up</button>
    </form>
    <div data-adm-checkin-results role="status" aria-live="polite">${results}</div>`;
}

// ---- Payments ---------------------------------------------------------------

function renderPayments({ utrCounts }) {
  const pending = state.payments.filter((p) => p.status === "pending_verification");
  const verifiedTotal = state.payments.filter((p) => p.status === "verified").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const filtered = [...state.payments]
    .filter(keepPayment)
    .sort((a, b) => (a.status === "pending_verification" ? 0 : 1) - (b.status === "pending_verification" ? 0 : 1) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const rows = filtered.map((p) => {
    const items = paymentItems(p);
    const expected = items.reduce((sum, it) => sum + eventFee(it.eventId), 0);
    const flags = [
      utrCounts.get(p.transactionRef) > 1 ? `<span class="admin-flag">DUPLICATE UTR</span>` : "",
      expected > 0 && Number(p.amount) !== expected ? `<span class="admin-flag">FEE IS ₹${e(expected)}</span>` : "",
    ].join("");
    return `
      <tr>
        <td>${items.map((it) => `<strong>${e(it.eventTitle || it.eventId)}</strong>${it.teamName ? ` <small>· Team ${e(it.teamName)}</small>` : ""}`).join("<br/>")}</td>
        <td>${e(p.payerName)}<br/><small>${e(p.payerEmail)} · ${e(p.payerPhone)}</small></td>
        <td><strong>₹${e(p.amount)}</strong></td>
        <td><code>${e(p.transactionRef || "—")}</code>${flags}</td>
        <td>${e(formatDate(p.createdAt))}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${p.status !== "pending_verification"
          ? `<small>${e(p.status === "verified" ? `By ${(p.verifiedBy || "").split("@")[0]}` : p.rejectionReason || "")}</small>`
          : state.rejecting === p.paymentId
            ? `<form class="adm-reject-form" data-adm-form="reject" data-id="${e(p.paymentId)}" novalidate>
                <label class="pp-field"><span>Reason shown to the participant</span>
                  <input type="text" name="reason" maxlength="200" value="UTR not found in bank statement" required aria-describedby="adm-reject-msg" />
                </label>
                <p class="pp-msg bad" id="adm-reject-msg" role="alert" aria-live="assertive"></p>
                <div class="admin-action-btn-group">
                  <button type="submit" class="btn-action-reject">Confirm reject</button>
                  <button type="button" class="pp-action subtle" data-adm="reject-cancel">Cancel</button>
                </div>
              </form>`
            : `<div class="admin-action-btn-group">
              <button type="button" class="btn-action-approve" data-adm="approve" data-id="${e(p.paymentId)}">✓ Approve</button>
              <button type="button" class="btn-action-reject" data-adm="reject" data-id="${e(p.paymentId)}">✕ Reject</button>
            </div>`}</td>
      </tr>`;
  });
  return `
    ${sectionHead("03 // PAYMENTS", "UPI payment verification", `Match each UTR against the bank statement for ${e(FEST_CONFIG.upiId || "the fest UPI account")} before approving.`)}
    <div class="adm-stats">
      ${stat(`₹${verifiedTotal.toLocaleString("en-IN")}`, "Verified collections")}
      ${stat(pending.length, "Pending verification", { alert: pending.length > 0 })}
      ${stat(state.payments.length, "Total submissions")}
    </div>
    ${toolbar({ statuses: ["pending_verification", "verified", "rejected"], placeholder: "Search payer, UTR, event…" })}
    ${table(["Events", "Payer", "Amount", "UTR", "Submitted", "Status", "Action"], rows, "No payment submissions", state.payments.length)}`;
}

// ---- Registrations ----------------------------------------------------------

function renderRegistrations({ regRows }) {
  const unpaid = regRows.filter((r) => r.payStatus === "unpaid" || r.payStatus === "rejected");
  const filtered = regRows
    .filter(keepRegistration)
    .sort((a, b) => String(a.event_title).localeCompare(String(b.event_title)) || String(a.user_name).localeCompare(String(b.user_name)));
  const rows = filtered.map(
    (r) => `
      <tr>
        <td><strong>${e(r.event_title)}</strong></td>
        <td>${e(r.user_name)}<br/><small>${e(r.user_email)}</small></td>
        <td>${e(r.user_phone)}</td>
        <td>${e(r.user_college)}<br/><small>${e(r.user_year || "")}</small></td>
        <td>${r.participation_type === "team" ? `${e(r.team_role || "team")} · <code>${e(r.team_code)}</code>` : "Solo"}</td>
        <td><code>${e(r.registration_qr_id)}</code></td>
        <td>${e(formatDate(r.registered_at))}</td>
        <td>${statusBadge(r.payStatus)}</td>
      </tr>`
  );
  return `
    ${sectionHead("04 // REGISTRATIONS", "All registrations", "UNPAID means a paid event has no verified payment for this entry. Don't admit until it's verified.")}
    <div class="adm-stats">
      ${stat(regRows.length, "Registrations")}
      ${stat(new Set(regRows.filter((r) => r.event_id !== ACCOMMODATION.id).map((r) => r.event_id)).size, "Events with entries")}
      ${stat(regRows.filter((r) => r.event_id === ACCOMMODATION.id).length, "Accommodation bookings")}
      ${stat(unpaid.length, "Unpaid / rejected", { alert: unpaid.length > 0 })}
    </div>
    ${toolbar({ events: true, statuses: ["free", "verified", "pending_verification", "unpaid", "rejected"] })}
    ${table(["Event", "Participant", "Phone", "College", "Type", "Pass ID", "Registered", "Payment"], rows, "No registrations match", regRows.length)}`;
}

// ---- Teams ------------------------------------------------------------------

function renderTeams({ leaderContact }) {
  const filtered = state.teams.filter(keepTeam);
  const rows = filtered.map((t) => {
    const c = leaderContact.get(t.teamId) || {};
    const small = (t.teamSize || 1) < (t.minTeamSize || 1);
    const linked = (t.linkedMembers || []).length;
    return `
      <tr>
        <td><strong>${e(t.teamName)}</strong><br/><small>${(t.members || []).map((m) => e(m.name)).join(", ")}</small></td>
        <td><code>${e(t.teamCode)}</code></td>
        <td>${e(t.eventName)}</td>
        <td>${e(t.leaderName)}<br/><small>${e(c.email || "")} · ${e(c.phone || "")}</small></td>
        <td>${e(t.teamSize || 1)} / ${e(t.maxTeamSize || "?")}${small ? `<span class="admin-flag">MIN ${e(t.minTeamSize)}</span>` : ""}<br/><small>${linked} linked account${linked === 1 ? "" : "s"}</small></td>
        <td>${statusBadge(t.paymentStatus || "free")}</td>
      </tr>`;
  });
  return `
    ${sectionHead("05 // TEAMS", "Teams")}
    <div class="adm-stats">
      ${stat(state.teams.length, "Teams")}
      ${stat(state.teams.reduce((sum, t) => sum + (t.teamSize || 1), 0), "Team members")}
      ${stat(state.teams.filter((t) => (t.teamSize || 1) < (t.minTeamSize || 1)).length, "Below minimum size")}
    </div>
    ${toolbar({ events: true, placeholder: "Search team, code, leader, member…" })}
    ${table(["Team", "Code", "Event", "Leader", "Size", "Payment"], rows, "No teams match", state.teams.length)}`;
}

// ---- Accounts ---------------------------------------------------------------

function renderAttendees() {
  const filtered = state.attendees.filter(keepAttendee);
  const rows = filtered.map(
    (a) => `
      <tr>
        <td><strong>${e(a.displayName || a.name || "—")}</strong></td>
        <td>${e(a.email)}</td>
        <td>${e(a.college)}<br/><small>${e(a.year || "")}</small></td>
        <td>${e(a.phone)}</td>
        <td><code>${e(a.studentId)}</code></td>
        <td>${e((a.registeredEvents || []).join(", ") || "—")}</td>
      </tr>`
  );
  return `
    ${sectionHead("06 // ACCOUNTS", "Participant accounts")}
    <div class="adm-stats">
      ${stat(state.attendees.length, "Accounts")}
      ${stat(new Set(state.attendees.map((a) => (a.college || "").toLowerCase()).filter(Boolean)).size, "Colleges")}
      ${stat(state.attendees.filter((a) => (a.registeredEventIds || a.registeredEvents || []).length).length, "With registrations")}
    </div>
    ${toolbar({ placeholder: "Search name, email, college, phone, ID…" })}
    ${table(["Name", "Email", "College", "Phone", "Chaitanya ID", "Events"], rows, "No accounts match", state.attendees.length)}`;
}

// ---- Queries ----------------------------------------------------------------

function renderQueries() {
  const filtered = [...state.queries]
    .filter(keepQuery)
    .sort((a, b) => ((a.status === "resolved") - (b.status === "resolved")) || String(b.created_at).localeCompare(String(a.created_at)));
  const rows = filtered.map(
    (q) => `
      <tr>
        <td>${e(q.name || "—")}<br/><small>${e(q.email || "")}${q.phone ? ` · ${e(q.phone)}` : ""}</small>${q.team_name ? `<br/><small>Team ${e(q.team_name)}</small>` : ""}</td>
        <td class="adm-message"><strong>${e(q.subject || "")}</strong><br/>${e(q.message || "")}</td>
        <td>${e(formatDate(q.created_at))}</td>
        <td>${statusBadge(q.status || "open")}</td>
        <td>
          ${q.email ? `<a class="pp-action subtle" href="mailto:${e(q.email)}?subject=${encodeURIComponent(`Re: ${q.subject || "Your Chaitanya 2k26 query"}`)}">Reply</a>` : ""}
          <button type="button" class="pp-action ${q.status === "resolved" ? "subtle" : ""}" data-adm="query-status" data-id="${e(q.id || q._docId)}" data-status="${q.status === "resolved" ? "open" : "resolved"}">${q.status === "resolved" ? "Reopen" : "Mark resolved"}</button>
        </td>
      </tr>`
  );
  const open = state.queries.filter((q) => q.status !== "resolved").length;
  return `
    ${sectionHead("07 // QUERIES", "Contact form messages")}
    <div class="adm-stats">
      ${stat(open, "Open", { alert: open > 0 })}
      ${stat(state.queries.length - open, "Resolved")}
      ${stat(state.queries.length, "Total")}
    </div>
    ${toolbar({ statuses: ["open", "resolved"], placeholder: "Search name, email, message…" })}
    ${table(["From", "Message", "Received", "Status", "Action"], rows, "No queries match", state.queries.length)}`;
}

// ---- Setup / Dev cache ------------------------------------------------------

function renderSetup() {
  return `
    ${sectionHead("08 // SETUP", "Event catalog sync")}
    <section class="adm-card">
      <p class="pp-hint">Writes the event catalog (with entry fees) to the <code>events</code> collection. The security rules use these fees to stop paid events being registered as free. Run it again after editing <code>_nuxt/events-data.js</code>.</p>
      <button type="button" class="pp-primary" data-adm="seed">Sync events &amp; FAQs to Firestore</button>
      <p class="pp-hint" data-adm-seed-progress role="status" aria-live="polite" hidden></p>
    </section>`;
}

// ---- Security ---------------------------------------------------------------

// Patterns that should never appear in participant-entered text.
const SUSPICIOUS = [
  [/<[a-z\/!?]/i, "HTML tag"],
  [/<script/i, "script tag"],
  [/javascript\s*:/i, "javascript: URL"],
  [/data\s*:\s*text\/html/i, "data:text/html URL"],
  [/\bon\w+\s*=/i, "event handler"],
  [/&#(x0*3[ce]|0*6[02]);?/i, "encoded < or >"],
];

// [state key, collection, doc id, owner label]
const SCAN_SOURCES = [
  ["attendees", "users", (d) => d._docId || d.uid, (d) => d.email || d.uid],
  ["teams", "teams", (d) => d._docId || d.teamId, (d) => d.leaderEmail || d.leaderUid],
  ["registrations", "registrations", (d) => d._docId || d.id, (d) => d.user_email || d.user_id],
  ["payments", "payments", (d) => d._docId || d.paymentId, (d) => d.payerEmail || d.payerUid],
  ["queries", "queries", (d) => d._docId || d.id, (d) => d.email || d.uid],
];

function suspicionReasons(key, value) {
  const reasons = SUSPICIOUS.filter(([re]) => re.test(value)).map(([, label]) => label);
  if (key === "photoURL" && value && !value.startsWith("https://")) reasons.push("photoURL not https");
  return reasons;
}

// Walks strings inside nested maps/arrays; skips Firestore Timestamps and _docId.
function walkStrings(value, path, visit) {
  if (typeof value === "string") return visit(path, value);
  if (!value || typeof value !== "object" || typeof value.toDate === "function") return;
  if (Array.isArray(value)) return value.forEach((v, i) => walkStrings(v, [...path, i], visit));
  Object.keys(value).forEach((k) => !k.startsWith("_") && walkStrings(value[k], [...path, k], visit));
}

function scanSuspicious() {
  const hits = [];
  SCAN_SOURCES.forEach(([key, col, idOf, ownerOf]) =>
    state[key].forEach((doc) =>
      walkStrings(doc, [], (path, value) => {
        const reasons = suspicionReasons(path[path.length - 1], value);
        if (reasons.length) hits.push({ key, col, doc, id: idOf(doc), owner: ownerOf(doc) || "—", path, value, reasons });
      })
    )
  );
  return hits;
}

function runScan() {
  state.scan = { hits: scanSuspicious(), at: new Date() };
}

/** Strip tags/handlers/script URLs; fall back to "Removed" if anything is left. */
function cleanValue(key, value) {
  if (key === "photoURL") return "";
  let s = value;
  for (let prev; prev !== s; ) {
    prev = s;
    s = s
      .replace(/&#(x0*3[ce]|0*6[02]);?/gi, "")
      .replace(/<[^>]*>?/g, "")
      .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|\S*)/gi, "")
      .replace(/javascript\s*:|data\s*:\s*text\/html/gi, "");
  }
  s = s.trim();
  return !s || suspicionReasons(key, s).length ? "Removed" : s;
}

// Copy only the containers along `path` so Timestamps elsewhere stay intact.
function setAtPath(value, path, next) {
  if (!path.length) return next;
  const copy = Array.isArray(value) ? [...value] : { ...value };
  copy[path[0]] = setAtPath(value[path[0]], path.slice(1), next);
  return copy;
}

const fieldPath = (path) => path.map((p) => (typeof p === "number" ? `[${p}]` : p)).join(".").replace(/\.\[/g, "[");
const truncate = (s, n = 140) => (s.length > n ? `${s.slice(0, n)}…` : s);

function renderSecurity() {
  const { hits, at } = state.scan || { hits: [], at: null };
  const when = at ? at.toLocaleTimeString("en-IN", { timeStyle: "medium" }) : "—";
  const rows = hits.map(
    (h, i) => `
      <tr>
        <td><strong>${e(h.col)}</strong><br/><small class="mono">${e(h.id || "—")}</small></td>
        <td><code>${e(fieldPath(h.path))}</code><br/>${h.reasons.map((r) => `<span class="admin-flag">${e(r.toUpperCase())}</span>`).join("")}</td>
        <td>${e(h.owner)}</td>
        <td class="adm-message"><code class="adm-sec-value">${e(truncate(h.value))}</code></td>
        <td><div class="admin-action-btn-group">
          <button type="button" class="pp-action" data-adm="sec-clean" data-index="${i}">Clean</button>
          ${h.col === "users" ? `<button type="button" class="btn-action-reject" data-adm="sec-delete" data-index="${i}">Delete profile document</button>` : ""}
        </div></td>
      </tr>`
  );
  return `
    ${sectionHead("09 // SECURITY", "Suspicious data", "Scans every loaded account, team, registration, payment and query for HTML tags, event handlers, script URLs, encoded angle brackets and non-https photo URLs. Values are shown escaped.")}
    <section class="adm-card">
      <p class="pp-hint">Also disable the Google account in Firebase console → Authentication if it looks malicious.</p>
      <div class="prof-actions"><button type="button" class="pp-action subtle" data-adm="sec-rescan">↻ Re-scan</button></div>
    </section>
    ${hits.length
      ? `<p class="adm-result-count">${hits.length} suspicious value${hits.length === 1 ? "" : "s"} · scanned ${e(when)}</p>
        <div class="admin-table-wrap" role="region" tabindex="0" aria-label="Suspicious data table">
          <table class="admin-table">
            <caption class="sr-only">Suspicious data, ${hits.length} found</caption>
            <thead><tr>${["Document", "Field", "Owner", "Value (escaped)", "Action"].map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead>
            <tbody>${rows.join("")}</tbody>
          </table>
        </div>`
      : `<section class="adm-card"><p class="pp-hint">✓ No suspicious data found · scanned ${e(when)}</p></section>`}`;
}

async function securityAction(hit, kind, btn) {
  const label = `${hit.col}/${hit.id}`;
  const top = hit.path[0];
  const ask = kind === "delete"
    ? `Delete the profile document ${label} (${hit.owner})? This cannot be undone.`
    : `Clean ${fieldPath(hit.path)} on ${label} (${hit.owner})?`;
  if (!hit.id || !confirm(ask)) return;
  state.actionError = "";
  btn.disabled = true;
  let message;
  try {
    if (kind === "delete") {
      await adminDeleteDoc(hit.col, hit.id);
      state[hit.key] = state[hit.key].filter((d) => d !== hit.doc);
      message = `Deleted ${label}.`;
    } else {
      const next = setAtPath(hit.doc[top], hit.path.slice(1), cleanValue(hit.path[hit.path.length - 1], hit.value));
      await adminSetField(hit.col, hit.id, top, next);
      hit.doc[top] = next;
      message = `Cleaned ${fieldPath(hit.path)} on ${label}.`;
    }
  } catch (err) {
    state.actionError = `Could not ${kind === "delete" ? "delete" : "clean"} ${label}: ${err.message}`;
    message = state.actionError;
  }
  runScan();
  renderShell();
  focusMain();
  announce(`${message} ${state.scan.hits.length} suspicious value${state.scan.hits.length === 1 ? "" : "s"} left.`);
}

function renderRedis() {
  return `
    ${sectionHead("10 // DEV CACHE", "Local dev server cache")}
    <section class="adm-card">
      <p class="pp-hint" id="redis-stat-meta">Loading /api/cache/stats…</p>
      <div class="prof-actions">
        <button type="button" class="pp-action subtle" data-adm="redis-refresh">Refresh</button>
        <button type="button" class="pp-action" data-adm="redis-purge">Purge cache</button>
      </div>
    </section>`;
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
// EVENTS
// ----------------------------------------------------------------------------

function setSection(id) {
  state.section = id;
  state.actionError = "";
  state.rejecting = null;
  state.search = "";
  state.statusFilter = "all";
  if (id !== "registrations" && id !== "teams") state.eventFilter = "all";
  history.replaceState(history.state, "", `/admin#${id}`);
  renderShell();
  // renderShell rebuilt the sidebar: keep focus on the (now current) button.
  state.root?.querySelector(`.adm-nav-btn[data-section="${id}"]`)?.focus();
}

async function updatePayment(payment, kind, reason, btn) {
  state.actionError = "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = kind === "approve" ? "Approving…" : "Rejecting…";
  }
  try {
    const res = kind === "approve" ? await approvePayment(payment) : await rejectPayment(payment, reason);
    Object.assign(payment, res.payment);
    paymentItems(payment).forEach((item) => {
      const reg = state.registrations.find((r) => r.event_id === item.eventId && r.user_id === payment.payerUid);
      if (reg) reg.payment_status = payment.status;
      const team = item.teamId && state.teams.find((t) => t.teamId === item.teamId);
      if (team) team.paymentStatus = payment.status === "verified" ? "paid" : payment.status;
    });
    state.rejecting = null;
    announce(`Payment from ${payment.payerName || "the participant"} ${kind === "approve" ? "approved" : "rejected"}.`);
  } catch (err) {
    state.actionError = `Could not update the payment from ${payment.payerName || "this participant"}: ${err.message}`;
  }
  renderShell();
  // The clicked button was re-rendered away; keep keyboard focus in the section.
  focusMain();
}

function focusMain() {
  const main = state.root?.querySelector("#adm-main");
  if (!main) return;
  main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}

async function onClick(evt) {
  const btn = evt.target.closest("[data-adm]");
  if (!btn) return;
  const action = btn.dataset.adm;

  if (action === "login") return window.openAuthModal?.("login");
  if (action === "nav") {
    evt.preventDefault();
    return goTo(btn.dataset.path);
  }
  if (action === "section") return setSection(btn.dataset.section);
  if (action === "event-drill") {
    state.eventFilter = btn.dataset.eventId;
    state.section = "registrations";
    state.search = "";
    state.statusFilter = "all";
    history.replaceState(history.state, "", "/admin#registrations");
    return renderShell();
  }
  if (action === "reload") return loadData();
  if (action === "excel") return exportMasterExcel(computeData());
  if (action === "csv") return exportSectionCsv(computeData());

  if (action === "reject") {
    const payment = state.payments.find((p) => p.paymentId === btn.dataset.id);
    state.rejecting = btn.dataset.id;
    renderMain();
    state.root.querySelector(".adm-reject-form input")?.select();
    announce(`Rejecting the payment from ${payment?.payerName || "this participant"}. Enter the reason shown to them, then confirm.`);
    return;
  }
  if (action === "reject-cancel") {
    const id = state.rejecting;
    state.rejecting = null;
    renderMain();
    // Return focus to the row's Reject button instead of dropping it on <body>.
    state.root.querySelector(`[data-adm="reject"][data-id="${CSS.escape(id || "")}"]`)?.focus();
    announce("Rejection cancelled.");
    return;
  }
  if (action === "approve") {
    const payment = state.payments.find((p) => p.paymentId === btn.dataset.id);
    if (!payment) return;
    await updatePayment(payment, "approve", null, btn);
    return;
  }
  if (action === "query-status") {
    const query = state.queries.find((q) => (q.id || q._docId) === btn.dataset.id);
    if (!query) return;
    btn.disabled = true;
    try {
      Object.assign(query, await setQueryStatus(query, btn.dataset.status));
      state.actionError = "";
    } catch (err) {
      state.actionError = `Could not update the query from ${query.name || "this sender"}: ${err.message}`;
    }
    renderShell();
    return;
  }

  if (action === "sec-rescan") {
    runScan();
    renderShell();
    focusMain();
    announce(`Scan complete: ${state.scan.hits.length} suspicious value${state.scan.hits.length === 1 ? "" : "s"}.`);
    return;
  }
  if (action === "sec-clean" || action === "sec-delete") {
    const hit = state.scan?.hits[Number(btn.dataset.index)];
    if (hit) await securityAction(hit, action === "sec-delete" ? "delete" : "clean", btn);
    return;
  }

  if (action === "seed") {
    const progress = state.root.querySelector("[data-adm-seed-progress]");
    btn.disabled = true;
    progress.hidden = false;
    progress.textContent = "Connecting to Firestore…";
    try {
      const res = await applySchemaToFirestore((p) => (progress.textContent = p.message));
      const codes = await backfillTeamCodes(state.teams || []);
      progress.textContent = `✓ Synced ${res.eventsCreated} events, ${res.faqsCreated} FAQs and ${codes} team codes.${res.errors?.length ? ` Errors: ${res.errors.join("; ")}` : ""}`;
    } catch (err) {
      progress.textContent = `Sync failed: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (action === "redis-refresh") return loadRedisStats(state.root);
  if (action === "redis-purge") {
    if (!confirm("Purge the local dev server cache?")) return;
    await fetch("/api/cache/purge", { method: "POST" }).catch(() => {});
    return loadRedisStats(state.root);
  }
}

function onInput(evt) {
  const field = evt.target.dataset?.admFilter;
  if (!field) return;
  if (field === "search") {
    if (evt.type !== "input") return;
    state.search = evt.target.value;
  }
  if (field === "event") state.eventFilter = evt.target.value;
  if (field === "status") state.statusFilter = evt.target.value;
  rerenderTable();
}

function onSubmit(evt) {
  const form = evt.target.closest("[data-adm-form]");
  if (!form) return;
  evt.preventDefault();
  if (form.dataset.admForm === "reject") {
    const payment = state.payments.find((p) => p.paymentId === form.dataset.id);
    const reason = form.reason.value.trim();
    if (!payment) return;
    if (!reason) {
      const msg = form.querySelector("#adm-reject-msg");
      if (msg) msg.textContent = "Enter the reason before rejecting this payment.";
      form.reason.setAttribute("aria-invalid", "true");
      form.reason.focus();
      return;
    }
    updatePayment(payment, "reject", reason, form.querySelector("button[type=submit]"));
    return;
  }
  if (form.dataset.admForm === "checkin") {
    state.checkin = { query: form.q.value };
    // Swap only the results so the live region (role="status") persists and
    // announces the verdict, and the input keeps focus for the next scan.
    const box = state.root.querySelector("[data-adm-checkin-results]");
    const tmp = document.createElement("div");
    tmp.innerHTML = renderCheckin(computeData());
    const fresh = tmp.querySelector("[data-adm-checkin-results]");
    if (box && fresh) box.innerHTML = fresh.innerHTML;
    else renderMain();
    state.root.querySelector(".adm-checkin-form input")?.select();
  }
}

// ----------------------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------------------

// filtered: apply the toolbar filters (section CSV); the master workbook exports everything.
function exportRows({ regRows, leaderContact }, filtered = false) {
  const pick = (list, keep) => (filtered ? list.filter(keep) : list);
  return {
    payments: {
      name: "Payments",
      headers: ["Payment ID", "Events", "Teams", "Payer", "Email", "Phone", "Amount (INR)", "UTR", "Status", "Submitted", "Verified/Rejected By", "Reason"],
      rows: pick(state.payments, keepPayment).map((p) => [
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
      rows: pick(regRows, keepRegistration).map((r) => [
        r.event_title, r.user_name, r.user_email, r.user_phone, r.user_college, r.user_year, r.student_id,
        r.participation_type === "team" ? `team ${r.team_role || ""}`.trim() : "solo",
        r.team_code, (r.team_members || []).map((m) => m.name).join("; "),
        r.registration_qr_id, STATUS_LABEL[r.payStatus] || r.payStatus, formatDate(r.registered_at),
      ]),
    },
    teams: {
      name: "Teams",
      headers: ["Team", "Code", "Event", "Leader", "Leader Email", "Leader Phone", "Members", "Size", "Max", "Payment"],
      rows: pick(state.teams, keepTeam).map((t) => {
        const c = leaderContact.get(t.teamId) || {};
        return [t.teamName, t.teamCode, t.eventName, t.leaderName, c.email, c.phone, (t.members || []).map((m) => m.name).join("; "), t.teamSize, t.maxTeamSize, t.paymentStatus];
      }),
    },
    attendees: {
      name: "Accounts",
      headers: ["Name", "Email", "College", "Year", "Phone", "Chaitanya ID", "Registered Events"],
      rows: pick(state.attendees, keepAttendee).map((a) => [a.displayName || a.name, a.email, a.college, a.year, a.phone, a.studentId, (a.registeredEvents || []).join("; ")]),
    },
    queries: {
      name: "Queries",
      headers: ["Received", "Name", "Email", "Phone", "Team", "Subject", "Message", "Status"],
      rows: pick(state.queries, keepQuery).map((q) => [formatDate(q.created_at), q.name, q.email, q.phone, q.team_name, q.subject, q.message, q.status || "open"]),
    },
  };
}

// Prevent spreadsheet formula injection from participant-entered text (CSV).
// A leading +/- is left alone when the value is only digits and phone
// punctuation (e.g. "+91 98765 43210"): it can't call a function.
function safeCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/^[=@\t\r]/.test(s)) return `'${s}`;
  return /^[+\-]/.test(s) && /[^\d\s+\-().]/.test(s) ? `'${s}` : s;
}

// XML 1.0 forbids these control characters; one would make Excel reject the workbook.
const stripControl = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

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

function exportSectionCsv(data) {
  const sheets = exportRows(data, true);
  const sheet = sheets[state.section] || sheets.registrations;
  const csvCell = (v) => `"${safeCell(v).replace(/"/g, '""')}"`;
  const csv = [sheet.headers, ...sheet.rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  downloadBlob("﻿" + csv, "text/csv;charset=utf-8", `chaitanya_2k26_${sheet.name.toLowerCase()}_${stamp()}.csv`);
}

function exportMasterExcel(data) {
  // Every cell is ss:Type="String", so no formula can run: no safeCell prefix here.
  const xml = (v) => stripControl(v === null || v === undefined ? "" : String(v)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const sheets = exportRows(data);
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
  ${[sheets.registrations, sheets.payments, sheets.teams, sheets.attendees, sheets.queries].map(sheetXml).join("")}
</Workbook>`;
  downloadBlob(content, "application/vnd.ms-excel;charset=utf-8", `chaitanya_2k26_master_${stamp()}.xls`);
}

if (typeof window !== "undefined") {
  window.mountAdminPage = mountAdminPage;
}
