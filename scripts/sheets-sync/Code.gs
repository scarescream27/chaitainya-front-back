/**
 * Chaitanya 2k26 — self-updating Google Sheet of registrations.
 *
 * Paste this file and appsscript.json into a Google Sheet's Apps Script
 * project (Extensions → Apps Script), run setup() once, approve access.
 * It then refreshes every 15 minutes and from the "Chaitanya" menu.
 * Full steps: scripts/sheets-sync/README.md.
 *
 * Reads Firestore with the signed-in Google account's own access (it must be
 * an Owner/Editor of the Firebase project). No keys are stored anywhere and
 * nothing is written back to the database: read-only.
 */

const PROJECT_ID = "chaitainya-hptu";
const REFRESH_MINUTES = 15; // 1, 5, 10, 15 or 30
const PER_EVENT_TABS = true; // one tab per event with its participant list

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/%28default%29/documents/`;
const FIXED_TABS = ["Summary", "Registrations", "Payments", "Teams", "Accounts", "Queries"];
const EVENT_TAB_PREFIX = "Ev · ";

// ---- Menu & trigger ---------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Chaitanya")
    .addItem("Refresh now", "refresh")
    .addItem("Turn on auto-refresh", "setup")
    .addItem("Turn off auto-refresh", "stopAutoRefresh")
    .addToUi();
}

/** Run once: installs the timed refresh and fills the sheet. */
function setup() {
  stopAutoRefresh();
  ScriptApp.newTrigger("refresh").timeBased().everyMinutes(REFRESH_MINUTES).create();
  refresh();
}

function stopAutoRefresh() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "refresh")
    .forEach((t) => ScriptApp.deleteTrigger(t));
}

// ---- Firestore (REST, read-only) --------------------------------------------

function fetchAll(collection) {
  const token = ScriptApp.getOAuthToken();
  const docs = [];
  let pageToken = "";
  do {
    const url = `${BASE}${collection}?pageSize=300${pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : ""}`;
    const res = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error(`Reading ${collection} failed (${res.getResponseCode()}): ${res.getContentText().slice(0, 300)}`);
    }
    const body = JSON.parse(res.getContentText());
    (body.documents || []).forEach((d) => docs.push(Object.assign({ _id: d.name.split("/").pop() }, fields(d.fields || {}))));
    pageToken = body.nextPageToken || "";
  } while (pageToken);
  return docs;
}

function fields(f) {
  const out = {};
  Object.keys(f).forEach((k) => (out[k] = value(f[k])));
  return out;
}

function value(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(value);
  if ("mapValue" in v) return fields(v.mapValue.fields || {});
  return "";
}

// ---- Formatting helpers -------------------------------------------------------

const TZ = "Asia/Kolkata";

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : Utilities.formatDate(d, TZ, "dd MMM yyyy, HH:mm");
}

// Text people typed (names, messages) must never run as a formula in Sheets.
function cell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  const s = Array.isArray(v) ? v.join(", ") : String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

const STATUS = {
  verified: "Paid (checked)",
  pending_verification: "Payment to check",
  pending: "Payment to check",
  rejected: "Payment rejected",
  free: "Free",
  team: "Covered by team",
};

function writeTab(ss, name, headers, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  const data = [headers].concat(rows.length ? rows : [headers.map((_, i) => (i === 0 ? "Nothing yet" : ""))]);
  sh.getRange(1, 1, data.length, headers.length).setValues(data.map((r) => r.map(cell)));
  sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#111111").setFontColor("#ffffff");
  sh.setFrozenRows(1);
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, data.length, headers.length).createFilter();
  return sh;
}

// ---- Main ---------------------------------------------------------------------

// Users can store odd shapes in their own documents: treat a non-list as empty.
function list(v) {
  return Array.isArray(v) ? v : [];
}

function refresh() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // a refresh is already running
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const regs = fetchAll("registrations");
    const payments = fetchAll("payments");
    const teams = fetchAll("teams");
    const users = fetchAll("users");
    const queries = fetchAll("queries");

    const teamById = Object.create(null);
    teams.forEach((t) => (teamById[t.teamId || t._id] = t));
    const payById = Object.create(null);
    payments.forEach((p) => (payById[p.paymentId || p._id] = p));

    // Effective payment status: a teammate's status is their leader's payment.
    const statusOf = (r) => {
      if (r.payment_status === "team") {
        const pay = payById[r.payment_id];
        return pay ? STATUS[pay.status] || pay.status : STATUS.team;
      }
      if (r.payment_status === "pending_verification" && payById[r.payment_id]) {
        const s = payById[r.payment_id].status;
        return STATUS[s] || s;
      }
      return STATUS[r.payment_status] || r.payment_status || "";
    };

    regs.sort((a, b) => String(a.event_title).localeCompare(String(b.event_title)) || String(a.registered_at).localeCompare(String(b.registered_at)));

    const regHeaders = ["Event", "Name", "Email", "Phone", "College", "Year", "Type", "Team", "Team code", "Role", "Payment", "Amount due (₹)", "Transaction ID", "Pass ID", "Registered at"];
    const regRow = (r) => {
      const team = teamById[r.team_id] || {};
      const pay = payById[r.payment_id] || {};
      return [
        r.event_title, r.user_name, r.user_email, r.user_phone, r.user_college, r.user_year,
        r.participation_type === "team" ? "Team" : "Solo",
        team.teamName || "", r.team_code || "", r.team_role || "",
        statusOf(r), r.amount_due || 0, pay.transactionRef || "", r.registration_qr_id, when(r.registered_at),
      ];
    };
    writeTab(ss, "Registrations", regHeaders, regs.map(regRow));

    writeTab(
      ss,
      "Payments",
      ["Status", "Payer", "Email", "Phone", "Events", "Amount (₹)", "Method", "Transaction ID", "Submitted", "Checked by", "Reason", "Payment ID"],
      payments
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((p) => [
          STATUS[p.status] || p.status, p.payerName, p.payerEmail, p.payerPhone,
          list(p.items).map((i) => i.eventTitle + (i.teamName ? ` (team ${i.teamName})` : "")).join("; "),
          p.amount, p.method || "upi", p.transactionRef, when(p.createdAt), p.verifiedBy || "", p.rejectionReason || "", p.paymentId || p._id,
        ])
    );

    writeTab(
      ss,
      "Teams",
      ["Event", "Team", "Code", "Leader", "College", "Size", "Members", "Joined accounts", "Payment"],
      teams
        .sort((a, b) => String(a.eventName).localeCompare(String(b.eventName)))
        .map((t) => [
          t.eventName, t.teamName, t.teamCode, t.leaderName, t.college, t.teamSize,
          list(t.members).map((m) => m.name).join(", "),
          list(t.linkedMembers).length,
          t.paymentId && payById[t.paymentId] ? STATUS[payById[t.paymentId].status] : STATUS[t.paymentStatus] || t.paymentStatus,
        ])
    );

    writeTab(
      ss,
      "Accounts",
      ["Name", "Email", "Phone", "College", "Year", "Student ID", "Events"],
      users.map((u) => [u.displayName || u.name, u.email, u.phone, u.college, u.year, u.studentId, list(u.registeredEvents).join(", ")])
    );

    writeTab(
      ss,
      "Queries",
      ["Received", "Name", "Email", "Phone", "Team", "Subject", "Message", "Status"],
      queries
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map((q) => [when(q.created_at), q.name, q.email, q.phone, q.team_name, q.subject, q.message, q.status])
    );

    // Summary: one line per event.
    // No prototype: an event title like "constructor" must not hit Object's keys.
    const byEvent = Object.create(null);
    regs.forEach((r) => {
      const e = (byEvent[r.event_title] = byEvent[r.event_title] || { total: 0, solo: 0, teams: new Set(), paid: 0, toCheck: 0, free: 0, rejected: 0 });
      e.total++;
      if (r.participation_type === "team") e.teams.add(r.team_id);
      else e.solo++;
      const s = statusOf(r);
      if (s === STATUS.verified) e.paid++;
      else if (s === STATUS.pending_verification) e.toCheck++;
      else if (s === STATUS.rejected) e.rejected++;
      else if (s === STATUS.free) e.free++;
    });
    const collected = payments.filter((p) => p.status === "verified").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const waiting = payments.filter((p) => p.status === "pending_verification").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const summaryRows = Object.keys(byEvent)
      .sort()
      .map((t) => {
        const e = byEvent[t];
        return [t, e.total, e.solo, e.teams.size, e.paid, e.toCheck, e.rejected, e.free];
      });
    summaryRows.push(["", "", "", "", "", "", "", ""]);
    summaryRows.push(["TOTAL PEOPLE", regs.length, "", teams.length, "", "", "", ""]);
    summaryRows.push(["MONEY CHECKED (₹)", collected, "", "", "", "", "", ""]);
    summaryRows.push(["MONEY TO CHECK (₹)", waiting, "", "", "", "", "", ""]);
    summaryRows.push(["ACCOUNTS", users.length, "", "", "", "", "", ""]);
    summaryRows.push(["LAST UPDATED", when(new Date().toISOString()), "", "", "", "", "", ""]);
    const summary = writeTab(ss, "Summary", ["Event", "People", "Solo", "Teams", "Paid (checked)", "Payment to check", "Rejected", "Free"], summaryRows);

    // One tab per event (only events with sign-ups); stale event tabs are removed.
    const wanted = {};
    if (PER_EVENT_TABS) {
      Object.keys(byEvent).forEach((title) => {
        const tab = (EVENT_TAB_PREFIX + title).replace(/[\[\]*?:\/\\]/g, " ").slice(0, 99);
        wanted[tab] = true;
        writeTab(ss, tab, regHeaders.slice(1), regs.filter((r) => r.event_title === title).map((r) => regRow(r).slice(1)));
      });
    }
    ss.getSheets().forEach((sh) => {
      const n = sh.getName();
      if (n.indexOf(EVENT_TAB_PREFIX) === 0 && !wanted[n]) ss.deleteSheet(sh);
    });

    // Fixed tabs first, Summary on top.
    FIXED_TABS.forEach((n, i) => {
      const sh = ss.getSheetByName(n);
      if (sh) {
        ss.setActiveSheet(sh);
        ss.moveActiveSheet(i + 1);
      }
    });
    ss.setActiveSheet(summary);
    const blank = ss.getSheetByName("Sheet1");
    if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  } finally {
    lock.releaseLock();
  }
}
