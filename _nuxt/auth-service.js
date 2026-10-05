/**
 * ============================================================================
 * Chaitanya 2k26 — Firebase Auth & Firestore Service
 * ============================================================================
 * Google Sign-In, attendee profiles (college, year, Chaitanya ID), cart
 * checkout into event registrations, teams, UPI payment submissions, admin
 * verification and Digital ID lookups.
 *
 * Cloud Firestore is the single source of truth. Every write is awaited and
 * errors are surfaced to the caller, so the UI never shows a "confirmed"
 * state for data that was not saved. Access control is enforced server-side
 * by firestore.rules; admin checks here only decide what UI to show.
 *
 * Demo mode (local-only storage) is used ONLY when Firebase is not configured.
 */

import {
  getFirebaseConfig,
  isFirebaseConfigured,
  isAdminUser,
} from "./firebase-config.js";
import { getEventById, isRegistrationOpen } from "./events-data.js";
import { isPaymentConfigured } from "./fest-config.js";

const SDK_VERSION = "10.12.0";
const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let firebaseApp = null;
let firebaseAuth = null;
let firebaseFirestore = null;
let firebaseAnalytics = null;
let fsMod = null;
let authMod = null;

let currentUser = null;
let initPromise = null;
let authListeners = [];

const DEMO_DB_KEY = "chaitanya_demo_db";
const DEMO_USER_KEY = "chaitanya_demo_user";

// Legacy keys from the previous localStorage-first implementation.
const LEGACY_KEYS = [
  "chaitanya_attendees_list",
  "chaitanya_teams_list",
  "chaitanya_payments_list",
  "chaitanya_registrations_list",
  "chaitanya_team_members_list",
  "chaitanya_queries_list",
];

export const PAYMENT_STATUS = {
  FREE: "free",
  PENDING: "pending_verification",
  VERIFIED: "verified",
  REJECTED: "rejected",
  TEAM: "team",
};

export const YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Postgraduate",
  "PhD",
  "Faculty / Staff",
  "Other",
];

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const STUDENT_ID_PATTERN = /^CH26-[A-Z2-9]{8}$/;

function isLive() {
  return Boolean(firebaseFirestore && firebaseAuth);
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value, max = 120) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanPhone(value) {
  return String(value ?? "").replace(/[^\d+\s-]/g, "").trim().slice(0, 20);
}

function cleanYear(value) {
  const v = cleanText(value, 40);
  return YEAR_OPTIONS.includes(v) ? v : "";
}

function randomCode(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

function newStudentId() {
  return `CH26-${randomCode(8)}`;
}

/**
 * Turn Firebase error codes into messages a participant can act on.
 */
function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  const code = err?.code || "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return new Error("Sign-in was cancelled.");
  }
  if (code === "auth/popup-blocked") {
    return new Error("Your browser blocked the Google sign-in popup. Allow popups for this site and try again.");
  }
  if (code === "auth/network-request-failed" || code === "unavailable") {
    return new Error("Network error. Check your internet connection and try again.");
  }
  if (code === "permission-denied") {
    return new Error("This action is not allowed for your account.");
  }
  if (err instanceof Error && err.message && !code) return err;
  return new Error(fallback);
}

// ----------------------------------------------------------------------------
// INITIALISATION
// ----------------------------------------------------------------------------

export function initFirebase() {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit() {
  if (typeof window !== "undefined") {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem("chaitanya_active_user");
    } catch (e) {}
  }

  const config = getFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    try {
      const saved = localStorage.getItem(DEMO_USER_KEY);
      if (saved) currentUser = JSON.parse(saved);
    } catch (e) {}
    notifyListeners();
    return { app: null, auth: null, db: null, analytics: null };
  }

  try {
    const appMod = await import(`${SDK_BASE}/firebase-app.js`);
    authMod = await import(`${SDK_BASE}/firebase-auth.js`);
    fsMod = await import(`${SDK_BASE}/firebase-firestore.js`);

    firebaseApp = appMod.getApps().length === 0 ? appMod.initializeApp(config) : appMod.getApp();
    firebaseAuth = authMod.getAuth(firebaseApp);
    firebaseFirestore = fsMod.getFirestore(firebaseApp);

    if (config.measurementId) {
      import(`${SDK_BASE}/firebase-analytics.js`)
        .then(async ({ getAnalytics, isSupported }) => {
          if (await isSupported()) firebaseAnalytics = getAnalytics(firebaseApp);
        })
        .catch(() => {});
    }

    // Completes a redirect sign-in (used when popups are blocked on mobile).
    authMod.getRedirectResult(firebaseAuth).catch((err) => {
      console.warn("Redirect sign-in failed:", err?.code || err);
    });

    await new Promise((resolve) => {
      let first = true;
      authMod.onAuthStateChanged(firebaseAuth, async (fbUser) => {
        try {
          currentUser = fbUser ? await loadProfile(fbUser) : null;
        } catch (err) {
          console.warn("Could not load profile:", err);
          currentUser = fbUser ? baseProfile(fbUser) : null;
        }
        notifyListeners();
        if (first) {
          first = false;
          resolve();
        }
      });
    });
  } catch (err) {
    console.error("Failed to initialise Firebase:", err);
    firebaseAuth = null;
    firebaseFirestore = null;
  }

  return { app: firebaseApp, auth: firebaseAuth, db: firebaseFirestore, analytics: firebaseAnalytics };
}

function baseProfile(fbUser) {
  return {
    uid: fbUser.uid,
    displayName: fbUser.displayName || "Chaitanya Attendee",
    email: fbUser.email || "",
    photoURL: fbUser.photoURL || "",
    role: isAdminUser(fbUser.email) ? "admin" : "attendee",
    college: "",
    year: "",
    phone: "",
    studentId: "",
    registeredEvents: [],
    registeredEventIds: [],
    isDemo: false,
  };
}

/**
 * Ensure the users/{uid} document exists and merge it with auth details.
 */
async function loadProfile(fbUser, extra = {}) {
  const { doc, getDoc, setDoc, serverTimestamp } = fsMod;
  const ref = doc(firebaseFirestore, "users", fbUser.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};

  const displayName = cleanText(existing.displayName || fbUser.displayName || "Fest Attendee");
  const profile = {
    uid: fbUser.uid,
    name: displayName,
    displayName,
    email: fbUser.email || "",
    photoURL: fbUser.photoURL || "",
    college: cleanText(extra.college || existing.college || ""),
    year: cleanYear(extra.year || existing.year || ""),
    phone: cleanPhone(extra.phone || existing.phone || ""),
    studentId: STUDENT_ID_PATTERN.test(existing.studentId || "") ? existing.studentId : newStudentId(),
    registeredEvents: existing.registeredEvents || [],
    registeredEventIds: existing.registeredEventIds || [],
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) profile.createdAt = serverTimestamp();

  const needsWrite =
    !snap.exists() ||
    existing.studentId !== profile.studentId ||
    existing.email !== profile.email ||
    existing.photoURL !== profile.photoURL ||
    (extra.college && extra.college !== existing.college) ||
    (extra.year && extra.year !== existing.year) ||
    (extra.phone && extra.phone !== existing.phone);

  if (needsWrite) await setDoc(ref, profile, { merge: true });

  return {
    ...baseProfile(fbUser),
    displayName,
    college: profile.college,
    year: profile.year,
    phone: profile.phone,
    studentId: profile.studentId,
    registeredEvents: profile.registeredEvents,
    registeredEventIds: profile.registeredEventIds,
  };
}

// ----------------------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------------------

/**
 * Sign in with Google. `extraDetails` (college, year, phone) are saved on the
 * profile when provided by the registration form.
 */
export async function signInWithGoogle(extraDetails = {}) {
  await initFirebase();

  if (!isLive()) {
    if (isFirebaseConfigured(getFirebaseConfig())) {
      throw new Error("Could not connect to the sign-in service. Please refresh the page and try again.");
    }
    return demoSignIn(extraDetails);
  }

  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  let result;
  try {
    result = await authMod.signInWithPopup(firebaseAuth, provider);
  } catch (err) {
    if (err?.code === "auth/popup-blocked") {
      await authMod.signInWithRedirect(firebaseAuth, provider);
      return { success: true, redirect: true };
    }
    throw friendlyError(err, "Google sign-in failed. Please try again.");
  }

  try {
    currentUser = await loadProfile(result.user, extraDetails);
  } catch (err) {
    throw friendlyError(err, "Signed in, but your profile could not be saved. Please try again.");
  }
  notifyListeners();
  return { success: true, user: currentUser };
}

export async function signOutUser() {
  if (isLive()) {
    try {
      await authMod.signOut(firebaseAuth);
    } catch (e) {
      console.warn("Sign out error:", e);
    }
  }
  currentUser = null;
  try {
    localStorage.removeItem(DEMO_USER_KEY);
  } catch (e) {}
  notifyListeners();
  return { success: true };
}

export function getCurrentUser() {
  return currentUser;
}

/**
 * Update the signed-in user's own name / college / year / phone.
 */
export async function updateMyProfile({ displayName, college, year, phone } = {}) {
  const user = requireUser();
  const patch = {};
  if (displayName !== undefined) {
    const name = cleanText(displayName);
    if (!name) throw new Error("Name can't be empty.");
    patch.displayName = name;
    patch.name = name;
  }
  if (college !== undefined) patch.college = cleanText(college);
  if (year !== undefined) patch.year = cleanYear(year);
  if (phone !== undefined) patch.phone = cleanPhone(phone);
  if (!Object.keys(patch).length) return user;

  if (isLive()) {
    const { doc, setDoc, serverTimestamp } = fsMod;
    try {
      await setDoc(doc(firebaseFirestore, "users", user.uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      throw friendlyError(err, "Could not save your profile.");
    }
  } else {
    demoUpdate("users", user.uid, patch);
  }
  Object.assign(user, patch);
  persistDemoUser();
  notifyListeners();
  return user;
}

export function subscribeAuthState(callback) {
  if (typeof callback === "function") {
    authListeners.push(callback);
    try {
      callback(currentUser);
    } catch (e) {}
  }
  return () => {
    authListeners = authListeners.filter((cb) => cb !== callback);
  };
}

function notifyListeners() {
  for (const listener of authListeners) {
    try {
      listener(currentUser);
    } catch (err) {
      console.error("Auth listener error:", err);
    }
  }
}

function requireUser() {
  if (!currentUser) throw new Error("Please sign in first.");
  return currentUser;
}

function requireAdmin() {
  const user = requireUser();
  if (!isAdminUser(user.email)) throw new Error("Admin privileges required.");
  return user;
}

export function getFirebaseAnalytics() {
  return firebaseAnalytics;
}

// ----------------------------------------------------------------------------
// REGISTRATIONS, TEAMS & PAYMENTS
// ----------------------------------------------------------------------------

function registrationId(eventId, uid) {
  return `reg_${eventId}_${uid}`;
}

function passId(eventId, uid) {
  // Deterministic, so the same pass ID is shown every time it is opened.
  let hash = 0;
  for (const ch of `${eventId}:${uid}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `CH26-${eventId.replace(/-/g, "").slice(0, 4).toUpperCase()}-${String(hash % 100000).padStart(5, "0")}`;
}

function assertUtr(utr) {
  if (!/^\d{12}$/.test(utr || "")) {
    throw new Error("Enter the 12-digit UPI transaction reference (UTR) exactly as shown in your UPI app.");
  }
}

function addEventsToProfile(user, events) {
  const titles = new Set(user.registeredEvents || []);
  const ids = new Set(user.registeredEventIds || []);
  events.forEach((ev) => {
    titles.add(ev.title);
    ids.add(ev.id);
  });
  user.registeredEvents = [...titles];
  user.registeredEventIds = [...ids];
}

/**
 * Register for every event in the cart in one atomic write.
 *
 * @param items   [{ eventId, mode: "solo" | "team" }]
 * @param details { displayName, college, year, phone }
 * @param teams   { [eventId]: { teamName, members: [{ name, email }] } }
 * @param utr     12-digit UTR when the total is above zero
 */
export async function checkoutCart(items, details = {}, teams = {}, utr = "") {
  const user = requireUser();
  if (!Array.isArray(items) || !items.length) throw new Error("Your cart is empty.");

  const phone = cleanPhone(details.phone || user.phone);
  const college = cleanText(details.college || user.college);
  const year = cleanYear(details.year || user.year);
  const name = cleanText(details.displayName || user.displayName);
  if (!name) throw new Error("Please enter your name.");
  if (phone.replace(/\D/g, "").length < 10) throw new Error("Please enter a valid contact number.");
  if (!college) throw new Error("Please enter your college / institute.");
  if (!year) throw new Error("Please select your year.");

  // Validate every item before writing anything.
  const lines = items.map(({ eventId, mode }) => {
    const ev = getEventById(eventId);
    if (!ev) throw new Error("One of the events in your cart no longer exists.");
    if (!isRegistrationOpen(ev)) throw new Error(`Registration for ${ev.title} is closed.`);
    if (isEventRegistered(ev.id)) throw new Error(`You're already registered for ${ev.title}.`);
    const isTeam = ev.registrationType === "team" || (ev.registrationType === "both" && mode === "team");

    let team = null;
    if (isTeam) {
      const t = teams[eventId] || {};
      const teamName = cleanText(t.teamName, 60);
      const members = (t.members || [])
        .map((m) => ({ name: cleanText(m.name), email: cleanText(m.email, 120).toLowerCase() }))
        .filter((m) => m.name);
      const size = members.length + 1;
      if (!teamName) throw new Error(`Enter a team name for ${ev.title}.`);
      if (size < ev.minTeam) throw new Error(`${ev.title} needs at least ${ev.minTeam} members including you.`);
      if (size > ev.maxTeam) throw new Error(`${ev.title} allows at most ${ev.maxTeam} members including you.`);
      team = { teamName, members };
    }
    return { ev, isTeam, team, amount: Number(ev.entryFeeNum) || 0 };
  });

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const payId = total > 0 ? `pay_${user.uid}_${Date.now()}` : null;
  if (total > 0) {
    if (!isPaymentConfigured()) throw new Error("Online payment isn't open yet.");
    assertUtr(String(utr).trim());
  }

  const writes = []; // [collection, id, data]
  const teamCodes = {};
  for (const line of lines) {
    const { ev, isTeam, team, amount } = line;
    const status = amount > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.FREE;
    let teamId = null;
    let teamCode = null;

    if (isTeam) {
      teamId = `team_${ev.id}_${user.uid}`;
      teamCode = await generateUniqueTeamCode(team.teamName);
      teamCodes[ev.id] = teamCode;
      // Team docs are readable by any signed-in user (needed to join by code),
      // so they hold names only; contact details live in private registrations.
      writes.push([
        "teams",
        teamId,
        {
          id: teamId,
          teamId,
          event_id: ev.id,
          eventId: ev.id,
          eventName: ev.title,
          team_name: team.teamName,
          teamName: team.teamName,
          team_code: teamCode,
          teamCode,
          leader_id: user.uid,
          leaderUid: user.uid,
          leaderName: name,
          college,
          members: [{ name, role: "Leader" }, ...team.members.map((m) => ({ name: m.name, role: "Member" }))],
          memberUids: [user.uid],
          linkedMembers: [{ uid: user.uid, name }],
          teamSize: team.members.length + 1,
          minTeamSize: ev.minTeam,
          maxTeamSize: ev.maxTeam,
          paymentStatus: amount > 0 ? "pending" : "free",
          paymentId: amount > 0 ? payId : null,
          created_at: nowIso(),
          registeredAt: nowIso(),
        },
      ]);
    }

    writes.push([
      "registrations",
      registrationId(ev.id, user.uid),
      {
        id: registrationId(ev.id, user.uid),
        user_id: user.uid,
        user_name: name,
        user_email: user.email,
        user_phone: phone,
        user_college: college,
        user_year: year,
        student_id: user.studentId || null,
        event_id: ev.id,
        event_title: ev.title,
        participation_type: isTeam ? "team" : "individual",
        team_id: teamId,
        team_code: teamCode,
        team_role: isTeam ? "leader" : null,
        team_members: isTeam ? team.members : [],
        registration_status: "registered",
        payment_status: status,
        payment_id: amount > 0 ? payId : null,
        amount_due: amount,
        registration_qr_id: passId(ev.id, user.uid),
        registered_at: nowIso(),
      },
    ]);
  }

  if (payId) {
    writes.unshift([
      "payments",
      payId,
      {
        paymentId: payId,
        payerUid: user.uid,
        payerName: name,
        payerEmail: user.email,
        payerPhone: phone,
        items: lines
          .filter((l) => l.amount > 0)
          .map((l) => ({
            eventId: l.ev.id,
            eventTitle: l.ev.title,
            amount: l.amount,
            type: l.isTeam ? "team" : "solo",
            teamId: l.isTeam ? `team_${l.ev.id}_${user.uid}` : null,
            teamName: l.isTeam ? l.team.teamName : null,
          })),
        amount: total,
        method: "upi",
        transactionRef: String(utr).trim(),
        status: PAYMENT_STATUS.PENDING,
        createdAt: nowIso(),
        verifiedAt: null,
        verifiedBy: null,
      },
    ]);
  }

  const evs = lines.map((l) => l.ev);
  if (isLive()) {
    const { doc, getDoc, writeBatch, arrayUnion, serverTimestamp } = fsMod;
    try {
      // Server-side duplicate check (another device may have registered).
      for (const ev of evs) {
        const snap = await getDoc(doc(firebaseFirestore, "registrations", registrationId(ev.id, user.uid)));
        if (snap.exists()) throw new Error(`You're already registered for ${ev.title}.`);
      }
      const batch = writeBatch(firebaseFirestore);
      writes.forEach(([col, id, data]) => batch.set(doc(firebaseFirestore, col, id), data));
      batch.set(
        doc(firebaseFirestore, "users", user.uid),
        {
          displayName: name,
          name,
          phone,
          college,
          year,
          registeredEvents: arrayUnion(...evs.map((e) => e.title)),
          registeredEventIds: arrayUnion(...evs.map((e) => e.id)),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();
    } catch (err) {
      throw friendlyError(err, "Registration could not be saved. Please try again.");
    }
  } else {
    for (const ev of evs) {
      if (demoGet("registrations", registrationId(ev.id, user.uid))) {
        throw new Error(`You're already registered for ${ev.title}.`);
      }
    }
    writes.forEach(([col, id, data]) => demoSet(col, id, data));
  }

  Object.assign(user, { displayName: name, phone, college, year });
  addEventsToProfile(user, evs);
  if (!isLive()) demoSet("users", user.uid, { ...user });
  persistDemoUser();
  notifyListeners();
  return { success: true, total, paymentId: payId, teamCodes, eventIds: evs.map((e) => e.id) };
}

/**
 * Join a team using the leader's team code (links your account to the team).
 */
export async function joinTeamWithCode(rawCode, ev = null, details = {}) {
  const user = requireUser();
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,6}-[A-Z0-9]{3,6}$/.test(code)) {
    throw new Error("Enter the team code exactly as your leader shared it (e.g. BYTE-4F8K).");
  }

  const phone = cleanPhone(details.phone || user.phone);
  const college = cleanText(details.college || user.college);
  const year = cleanYear(details.year || user.year);

  const found = await findTeamByCode(code);
  if (!found) throw new Error(`No team found with code "${code}". Check the code with your team leader.`);
  if (ev && found.eventId !== ev.id) {
    throw new Error(`Team ${code} is registered for "${found.eventName}", not this event.`);
  }

  const evInfo = { id: found.eventId, title: found.eventName };
  const link = { uid: user.uid, name: user.displayName || "Teammate" };
  const registration = {
    id: registrationId(found.eventId, user.uid),
    user_id: user.uid,
    user_name: link.name,
    user_email: user.email,
    user_phone: phone,
    user_college: college || found.college || "",
    user_year: year,
    student_id: user.studentId || null,
    event_id: found.eventId,
    event_title: found.eventName,
    participation_type: "team",
    team_id: found.teamId,
    team_code: code,
    team_role: "member",
    registration_status: "registered",
    payment_status: PAYMENT_STATUS.TEAM,
    payment_id: found.paymentId || null,
    amount_due: 0,
    registration_qr_id: passId(found.eventId, user.uid),
    registered_at: nowIso(),
  };

  if (isLive()) {
    const { doc, runTransaction, setDoc, arrayUnion, serverTimestamp } = fsMod;
    const teamRef = doc(firebaseFirestore, "teams", found.teamId);
    try {
      await runTransaction(firebaseFirestore, async (tx) => {
        const regRef = doc(firebaseFirestore, "registrations", registration.id);
        const [snap, regSnap] = [await tx.get(teamRef), await tx.get(regRef)];
        if (regSnap.exists()) throw new Error("You are already registered for this event.");
        if (!snap.exists()) throw new Error("This team no longer exists.");
        const t = snap.data();
        const uids = t.memberUids || [];
        if (uids.includes(user.uid)) throw new Error(`You are already in team "${t.teamName}".`);
        if (uids.length >= (t.maxTeamSize || 4)) {
          throw new Error(`Team "${t.teamName}" already has ${uids.length}/${t.maxTeamSize} linked accounts.`);
        }
        tx.update(teamRef, {
          memberUids: [...uids, user.uid],
          linkedMembers: [...(t.linkedMembers || []), link],
        });
        tx.set(regRef, registration);
      });
      await setDoc(
        doc(firebaseFirestore, "users", user.uid),
        {
          registeredEvents: arrayUnion(evInfo.title),
          registeredEventIds: arrayUnion(evInfo.id),
          ...(phone ? { phone } : {}),
          ...(college ? { college } : {}),
          ...(year ? { year } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      throw friendlyError(err, "Could not join the team. Please try again.");
    }
  } else {
    if (demoGet("registrations", registration.id)) throw new Error("You are already registered for this event.");
    const t = demoGet("teams", found.teamId);
    if (t.memberUids.includes(user.uid)) throw new Error(`You are already in team "${t.teamName}".`);
    if (t.memberUids.length >= t.maxTeamSize) throw new Error(`Team "${t.teamName}" is full.`);
    t.memberUids.push(user.uid);
    t.linkedMembers = [...(t.linkedMembers || []), link];
    demoSet("teams", t.teamId, t);
    demoSet("registrations", registration.id, registration);
  }

  if (phone) user.phone = phone;
  if (college) user.college = college;
  if (year) user.year = year;
  addEventsToProfile(user, [evInfo]);
  if (!isLive()) demoSet("users", user.uid, { ...user });
  persistDemoUser();
  notifyListeners();
  return { success: true, team: found, registration };
}

async function findTeamByCode(code) {
  if (isLive()) {
    const { collection, query, where, limit, getDocs } = fsMod;
    const snap = await getDocs(
      query(collection(firebaseFirestore, "teams"), where("teamCode", "==", code), limit(1))
    );
    return snap.empty ? null : snap.docs[0].data();
  }
  return demoList("teams").find((t) => t.teamCode === code) || null;
}

async function generateUniqueTeamCode(name) {
  const prefix = String(name).replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "TEAM";
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}-${randomCode(4)}`;
    if (!(await findTeamByCode(code))) return code;
  }
  throw new Error("Could not generate a team code. Please try again.");
}

/**
 * Effective booking status for a registration.
 * booked | pending | rejected
 */
export function bookingStatus(registration, payment, team) {
  const s = registration?.payment_status;
  if (s === PAYMENT_STATUS.FREE) return "booked";
  if (s === PAYMENT_STATUS.TEAM) {
    const ts = team?.paymentStatus;
    if (!ts || ts === "free" || ts === "paid" || ts === "verified") return "booked";
    return ts === "rejected" ? "rejected" : "pending";
  }
  const ps = payment?.status || s;
  if (ps === PAYMENT_STATUS.VERIFIED) return "booked";
  if (ps === PAYMENT_STATUS.REJECTED) return "rejected";
  return "pending";
}

async function getDocData(col, id) {
  if (!id) return null;
  if (isLive()) {
    const { doc, getDoc } = fsMod;
    try {
      const snap = await getDoc(doc(firebaseFirestore, col, id));
      return snap.exists() ? snap.data() : null;
    } catch {
      return null;
    }
  }
  return demoGet(col, id);
}

/**
 * The signed-in user's registration (with payment and team) for one event.
 */
export async function getMyRegistration(eventId) {
  const user = currentUser;
  if (!user) return null;
  const registration = await getDocData("registrations", registrationId(eventId, user.uid));
  if (!registration) return null;
  const team = await getDocData("teams", registration.team_id);
  const payment =
    registration.payment_id && registration.payment_status !== PAYMENT_STATUS.TEAM
      ? await getDocData("payments", registration.payment_id)
      : null;
  return { registration, payment, team, status: bookingStatus(registration, payment, team) };
}

/**
 * All of the signed-in user's registrations, newest first.
 */
export async function getMyRegistrations() {
  const user = currentUser;
  if (!user) return [];
  let regs = [];
  if (isLive()) {
    const { collection, query, where, getDocs } = fsMod;
    try {
      const snap = await getDocs(query(collection(firebaseFirestore, "registrations"), where("user_id", "==", user.uid)));
      regs = snap.docs.map((d) => d.data());
    } catch (err) {
      throw friendlyError(err, "Could not load your registrations.");
    }
  } else {
    regs = demoList("registrations").filter((r) => r.user_id === user.uid);
  }

  const paymentCache = new Map();
  const out = [];
  for (const registration of regs) {
    const team = await getDocData("teams", registration.team_id);
    let payment = null;
    if (registration.payment_id && registration.payment_status !== PAYMENT_STATUS.TEAM) {
      if (!paymentCache.has(registration.payment_id)) {
        paymentCache.set(registration.payment_id, await getDocData("payments", registration.payment_id));
      }
      payment = paymentCache.get(registration.payment_id);
    }
    out.push({ registration, payment, team, status: bookingStatus(registration, payment, team) });
  }
  return out.sort((a, b) => String(b.registration.registered_at).localeCompare(String(a.registration.registered_at)));
}

/**
 * Re-submit a UTR after a payment was rejected.
 */
export async function resubmitPaymentUtr(paymentIdValue, utr) {
  const user = requireUser();
  assertUtr(utr);
  const patch = { transactionRef: utr, status: PAYMENT_STATUS.PENDING, resubmittedAt: nowIso() };
  if (isLive()) {
    const { doc, updateDoc } = fsMod;
    try {
      await updateDoc(doc(firebaseFirestore, "payments", paymentIdValue), patch);
    } catch (err) {
      throw friendlyError(err, "Could not update the UTR. Please try again.");
    }
  } else {
    const p = demoGet("payments", paymentIdValue);
    if (!p || p.payerUid !== user.uid) throw new Error("Payment not found.");
    demoSet("payments", paymentIdValue, { ...p, ...patch });
  }
  return { success: true };
}

export function isEventRegistered(eventIdOrTitle) {
  const user = currentUser;
  if (!user || !eventIdOrTitle) return false;
  const target = String(eventIdOrTitle).toLowerCase().trim();
  const ids = (user.registeredEventIds || []).map((x) => String(x).toLowerCase());
  const titles = (user.registeredEvents || []).map((x) => String(x).toLowerCase().trim());
  return ids.includes(target) || titles.includes(target);
}

// ----------------------------------------------------------------------------
// DIGITAL ID VERIFICATION (organisers)
// ----------------------------------------------------------------------------

/**
 * Look up a Chaitanya ID from a scanned QR code. Admin only: participant data
 * is private, so only organiser accounts can confirm a card is genuine.
 */
export async function verifyStudentId(studentId) {
  requireAdmin();
  const id = String(studentId || "").trim().toUpperCase();
  if (!STUDENT_ID_PATTERN.test(id)) return { found: false, reason: "invalid" };

  let profile = null;
  let regs = [];
  if (isLive()) {
    const { collection, query, where, limit, getDocs } = fsMod;
    try {
      const users = await getDocs(query(collection(firebaseFirestore, "users"), where("studentId", "==", id), limit(1)));
      if (users.empty) return { found: false, reason: "unknown" };
      profile = users.docs[0].data();
      const snap = await getDocs(query(collection(firebaseFirestore, "registrations"), where("user_id", "==", profile.uid)));
      regs = snap.docs.map((d) => d.data());
    } catch (err) {
      throw friendlyError(err, "Could not verify this ID.");
    }
  } else {
    profile = demoList("users").find((u) => u.studentId === id) || null;
    if (!profile) return { found: false, reason: "unknown" };
    regs = demoList("registrations").filter((r) => r.user_id === profile.uid);
  }

  const events = [];
  for (const registration of regs) {
    const team = await getDocData("teams", registration.team_id);
    const payment =
      registration.payment_id && registration.payment_status !== PAYMENT_STATUS.TEAM
        ? await getDocData("payments", registration.payment_id)
        : null;
    events.push({ title: registration.event_title, status: bookingStatus(registration, payment, team), passId: registration.registration_qr_id });
  }
  return { found: true, profile, events, verified: events.some((e) => e.status === "booked") };
}

// ----------------------------------------------------------------------------
// CONTACT QUERIES
// ----------------------------------------------------------------------------

export async function submitQueryTicket(queryData = {}) {
  const queryId = `query_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id: queryId,
    user_id: currentUser ? currentUser.uid : null,
    subject: cleanText(queryData.subject || `Query from ${queryData.name || "Participant"}`, 200),
    message: String(queryData.message || queryData.query || "").slice(0, 5000),
    name: cleanText(queryData.name),
    email: cleanText(queryData.email),
    phone: cleanPhone(queryData.phone || queryData.contact_no),
    team_name: cleanText(queryData.team_name),
    status: "open",
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await initFirebase();
  if (isLive()) {
    const { doc, setDoc } = fsMod;
    await setDoc(doc(firebaseFirestore, "queries", queryId), record);
  }
  return { success: true, query: record };
}

// ----------------------------------------------------------------------------
// ADMIN
// ----------------------------------------------------------------------------

async function listCollection(name) {
  requireAdmin();
  await initFirebase();
  if (isLive()) {
    const { collection, getDocs } = fsMod;
    try {
      const snap = await getDocs(collection(firebaseFirestore, name));
      return snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
    } catch (err) {
      throw friendlyError(err, `Could not load ${name}.`);
    }
  }
  return demoList(name);
}

export function getRegisteredAttendees() {
  return listCollection("users");
}

export function getAllTeams() {
  return listCollection("teams");
}

export function getAllPayments() {
  return listCollection("payments");
}

export function getAllRegistrations() {
  return listCollection("registrations");
}

export function getAllQueries() {
  return listCollection("queries");
}

/**
 * Items covered by a payment (supports legacy single-event payments).
 */
export function paymentItems(payment) {
  if (Array.isArray(payment?.items) && payment.items.length) return payment.items;
  if (payment?.eventId) {
    return [{ eventId: payment.eventId, eventTitle: payment.eventTitle, amount: payment.amount, teamId: payment.teamId, teamName: payment.teamName }];
  }
  return [];
}

async function setPaymentStatus(payment, status, extra) {
  const admin = requireAdmin();
  const patch = { status, ...extra };
  const teamStatus = status === PAYMENT_STATUS.VERIFIED ? "paid" : status;
  const items = paymentItems(payment);

  if (isLive()) {
    const { doc, writeBatch } = fsMod;
    const batch = writeBatch(firebaseFirestore);
    batch.update(doc(firebaseFirestore, "payments", payment.paymentId), patch);
    items.forEach((item) => {
      batch.set(doc(firebaseFirestore, "registrations", registrationId(item.eventId, payment.payerUid)), { payment_status: status }, { merge: true });
      if (item.teamId) batch.set(doc(firebaseFirestore, "teams", item.teamId), { paymentStatus: teamStatus }, { merge: true });
    });
    try {
      await batch.commit();
    } catch (err) {
      throw friendlyError(err, "Could not update the payment.");
    }
  } else {
    demoUpdate("payments", payment.paymentId, patch);
    items.forEach((item) => {
      demoUpdate("registrations", registrationId(item.eventId, payment.payerUid), { payment_status: status });
      if (item.teamId) demoUpdate("teams", item.teamId, { paymentStatus: teamStatus });
    });
  }
  return { success: true, payment: { ...payment, ...patch }, admin: admin.email };
}

export async function approvePayment(payment) {
  const admin = requireAdmin();
  return setPaymentStatus(payment, PAYMENT_STATUS.VERIFIED, {
    verifiedAt: nowIso(),
    verifiedBy: admin.email,
    rejectionReason: null,
  });
}

export async function rejectPayment(payment, reason = "UTR not found / payment not received") {
  const admin = requireAdmin();
  return setPaymentStatus(payment, PAYMENT_STATUS.REJECTED, {
    rejectionReason: cleanText(reason, 200),
    rejectedAt: nowIso(),
    rejectedBy: admin.email,
  });
}

// ----------------------------------------------------------------------------
// DEMO MODE (only when Firebase is not configured)
// ----------------------------------------------------------------------------

function demoDb() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_DB_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function demoSave(db) {
  try {
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
  } catch (e) {}
}

function demoGet(col, id) {
  return (demoDb()[col] || {})[id] || null;
}

function demoSet(col, id, data) {
  const db = demoDb();
  db[col] = db[col] || {};
  db[col][id] = data;
  demoSave(db);
}

function demoUpdate(col, id, patch) {
  const existing = demoGet(col, id);
  if (existing) demoSet(col, id, { ...existing, ...patch });
}

function demoList(col) {
  return Object.values(demoDb()[col] || {});
}

function persistDemoUser() {
  if (isLive() || !currentUser) return;
  try {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(currentUser));
  } catch (e) {}
}

function demoSignIn(extra = {}) {
  const email = cleanText(extra.email || "demo.attendee@example.com");
  const existing = demoGet("users", "demo_" + slugify(email));
  if (existing) {
    currentUser = { ...existing };
    persistDemoUser();
    notifyListeners();
    return { success: true, user: currentUser, isDemo: true };
  }
  currentUser = {
    uid: "demo_" + slugify(email),
    displayName: cleanText(extra.displayName || "Demo Attendee"),
    email,
    photoURL: "",
    role: isAdminUser(email) ? "admin" : "attendee",
    college: cleanText(extra.college),
    year: cleanYear(extra.year),
    phone: cleanPhone(extra.phone),
    studentId: newStudentId(),
    registeredEvents: [],
    registeredEventIds: [],
    isDemo: true,
  };
  demoSet("users", currentUser.uid, { ...currentUser });
  persistDemoUser();
  notifyListeners();
  return { success: true, user: currentUser, isDemo: true };
}
