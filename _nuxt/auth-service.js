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
import { getEventById, isRegistrationOpen, isRegistrationPaused, isPastDeadline, EVENTS_DATA, ACCOMMODATION } from "./events-data.js";
import { getCartItems, setCartOwner } from "./cart.js";
import { FEST_CONFIG, isPaymentConfigured, isRazorpayEnabled } from "./fest-config.js";

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
let analyticsScheduled = false;

// Analytics is optional and must never compete with first paint or the 3D
// scene: wait for window load, then an idle slot (timeout fallback), and skip
// it entirely for visitors who send Do Not Track / Global Privacy Control.
function scheduleAnalytics(app) {
  if (analyticsScheduled || typeof window === "undefined") return;
  analyticsScheduled = true;
  const nav = window.navigator || {};
  if (
    nav.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    nav.globalPrivacyControl === true
  ) {
    return;
  }
  const load = () => {
    import(`${SDK_BASE}/firebase-analytics.js`)
      .then(async ({ getAnalytics, isSupported }) => {
        if (await isSupported()) firebaseAnalytics = getAnalytics(app);
      })
      .catch(() => {});
  };
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(load, { timeout: 10000 });
    } else {
      setTimeout(load, 3000);
    }
  };
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}

const DEMO_DB_KEY = "chaitanya_demo_db";
const DEMO_USER_KEY = "chaitanya_demo_user";
const PENDING_DETAILS_KEY = "chaitanya_pending_profile";

// Registration details saved before a redirect sign-in (read once).
function takePendingDetails() {
  try {
    const raw = sessionStorage.getItem(PENDING_DETAILS_KEY);
    sessionStorage.removeItem(PENDING_DETAILS_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (e) {
    return {};
  }
}

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
  // Project-setup problems: tell the organisers exactly what to fix.
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed") {
    return new Error("Google sign-in isn't enabled for this site yet. Please try again later (organisers: enable Google in Firebase Console → Authentication → Sign-in method).");
  }
  if (code === "auth/unauthorized-domain") {
    return new Error(`Sign-in isn't allowed on ${window.location.hostname} yet (organisers: add it in Firebase Console → Authentication → Settings → Authorized domains).`);
  }
  if (code === "auth/internal-error" || code === "auth/invalid-api-key") {
    return new Error("The sign-in service is misconfigured. Please contact the fest team.");
  }
  if (code) console.warn("Sign-in error:", code, err?.message);
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

    if (config.measurementId) scheduleAnalytics(firebaseApp);

    // Completes a redirect sign-in (used when popups are blocked on mobile).
    authMod.getRedirectResult(firebaseAuth).catch((err) => {
      console.warn("Redirect sign-in failed:", err?.code || err);
    });

    await new Promise((resolve) => {
      let first = true;
      authMod.onAuthStateChanged(firebaseAuth, async (fbUser) => {
        try {
          currentUser = fbUser ? await loadProfile(fbUser, takePendingDetails()) : null;
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

// In-flight profile loads per uid: first sign-in fires both the auth listener
// and signInWithGoogle, which must not create the profile twice concurrently.
const profileLoads = new Map();

function loadProfile(fbUser, extra = {}) {
  const uid = fbUser.uid;
  const prev = profileLoads.get(uid);
  // A load that carries form details still runs, but only after the one in flight.
  if (prev && !Object.values(extra || {}).some(Boolean)) return prev;
  const next = (prev ? prev.catch(() => {}) : Promise.resolve()).then(() => fetchProfile(fbUser, extra));
  const done = () => {
    if (profileLoads.get(uid) === next) profileLoads.delete(uid);
  };
  profileLoads.set(uid, next);
  next.then(done, done);
  return next;
}

/**
 * Ensure the users/{uid} document exists and merge it with auth details.
 */
async function fetchProfile(fbUser, extra = {}) {
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
      // The page reloads after a redirect sign-in; keep the registration
      // form's details so they are saved once the user comes back.
      try {
        sessionStorage.setItem(PENDING_DETAILS_KEY, JSON.stringify(extraDetails || {}));
      } catch (e) {}
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
  if (year !== undefined) {
    patch.year = cleanYear(year);
    if (cleanText(year) && !patch.year) throw new Error("Please pick your year from the list.");
  }
  if (phone !== undefined) {
    patch.phone = cleanPhone(phone);
    const digits = patch.phone.replace(/\D/g, "").length;
    if (digits && (digits < 10 || digits > 15)) throw new Error("Enter a valid phone number (10 digits, optional country code).");
  }
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
  // The cart is per user on every route (accommodationState and the profile read it too).
  setCartOwner(currentUser?.uid);
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

function hash32(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

export function passId(eventId, uid) {
  // Deterministic, so the same pass ID is shown every time it is opened.
  // Event part hashes the full event id, so events sharing a prefix don't collide.
  const ev = (hash32(eventId) % 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `CH26-${ev}-${String(hash32(`${eventId}:${uid}`) % 1e7).padStart(7, "0")}`;
}

// Format of passes issued before the hashed event part (still printed on old QRs).
export function legacyPassId(eventId, uid) {
  return `CH26-${eventId.replace(/-/g, "").slice(0, 4).toUpperCase()}-${String(hash32(`${eventId}:${uid}`) % 100000).padStart(5, "0")}`;
}

/**
 * Structured data encoded in a registration's entry QR: who (name, college),
 * which event, and the pass/registration IDs organisers can look up.
 * Kept under the QR generator's 213-byte limit by trimming long text fields.
 */
const QR_MAX_BYTES = 200;

export function registrationQrPayload(reg) {
  if (!reg) return "";
  if (reg.qr_payload) return reg.qr_payload;
  const data = {
    type: "CH26-REG",
    pass: reg.registration_qr_id || "",
    name: cleanText(reg.user_name, 60),
    college: cleanText(reg.user_college, 60),
    event: cleanText(reg.event_title, 60),
    eventId: reg.event_id || "",
  };
  const size = () => new TextEncoder().encode(JSON.stringify(data)).length;
  // Shorten the longest free-text field a little at a time until it fits.
  const fields = ["name", "college", "event"];
  while (size() > QR_MAX_BYTES) {
    const key = fields.reduce((a, b) => (data[b].length > data[a].length ? b : a));
    if (data[key].length <= 8) break;
    data[key] = data[key].slice(0, -2).trim();
  }
  if (size() > QR_MAX_BYTES) delete data.eventId;
  return JSON.stringify(data);
}

function assertUtr(utr) {
  if (!/^\d{12}$/.test(utr || "")) {
    throw new Error("Enter the 12-digit Transaction ID exactly as shown in your UPI app.");
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

const RAZORPAY_PAYMENT_ID = /^pay_[A-Za-z0-9]{14}$/;

/**
 * Check a checkout without writing anything (same rules checkoutCart applies).
 * Run it before taking money so nobody pays and then fails validation.
 */
export function validateCheckout(items, details = {}, teams = {}) {
  const { total } = checkCart(items, details, teams);
  return { total };
}

function checkCart(items, details, teams) {
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

  if (lines.some((l) => l.ev.isAccommodation)) {
    if (!isPaymentConfigured() && !isRazorpayEnabled()) throw new Error("Accommodation booking opens soon.");
    if (!lines.some((l) => !l.ev.isAccommodation) && !isRegisteredForAnyEvent()) {
      throw new Error("Accommodation is for registered participants — register for an event first (you can add both to the cart).");
    }
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { user, phone, college, year, name, lines, total };
}

/**
 * Register for every event in the cart in one atomic write.
 *
 * @param items   [{ eventId, mode: "solo" | "team" }]
 * @param details { displayName, college, year, phone }
 * @param teams   { [eventId]: { teamName, members: [{ name, email }] } }
 * @param utr     12-digit UTR when the total is above zero (UPI), or the
 *                Razorpay payment id (pay_...) when opts.method is "razorpay"
 * @param opts    { method: "upi" | "razorpay" }
 */
export async function checkoutCart(items, details = {}, teams = {}, utr = "", { method = "upi" } = {}) {
  const { user, phone, college, year, name, lines, total } = checkCart(items, details, teams);
  const viaRazorpay = method === "razorpay";
  const payId = total > 0 ? `pay_${user.uid}_${Date.now()}` : null;
  if (total > 0) {
    if (viaRazorpay) {
      if (!isRazorpayEnabled()) throw new Error("Online payment isn't open yet.");
      if (!RAZORPAY_PAYMENT_ID.test(String(utr).trim())) throw new Error("Missing Razorpay payment ID.");
    } else {
      if (!isPaymentConfigured()) throw new Error("Online payment isn't open yet.");
      assertUtr(String(utr).trim());
    }
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
      // Code -> team lookup. Teams can't be listed, so knowing the code is what lets you join.
      writes.push(["team_codes", teamCode, { teamId, eventId: ev.id }]);
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
    const reg = writes[writes.length - 1][2];
    reg.qr_payload = registrationQrPayload(reg);
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
        method: viaRazorpay ? "razorpay" : "upi",
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
  const registrations = writes.filter(([col]) => col === "registrations").map(([, , data]) => data);
  return { success: true, total, paymentId: payId, teamCodes, eventIds: evs.map((e) => e.id), registrations };
}

/**
 * Join a team using the leader's team code (links your account to the team).
 */
export async function joinTeamWithCode(rawCode, ev = null, details = {}) {
  if (isRegistrationPaused()) throw new Error("Registration is paused for now. Please try again later.");
  const user = requireUser();
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,6}-[A-Z0-9]{3,6}$/.test(code)) {
    throw new Error("Enter the team code exactly as your leader shared it (e.g. BYTE-4F8K).");
  }

  const name = cleanText(details.displayName || user.displayName) || "Teammate";
  const phone = cleanPhone(details.phone || user.phone);
  const college = cleanText(details.college || user.college);
  const year = cleanYear(details.year || user.year);

  const found = await findTeamByCode(code);
  if (!found) throw new Error(`No team found with code "${code}". Check the code with your team leader.`);
  if (ev && found.eventId !== ev.id) {
    throw new Error(`Team ${code} is registered for "${found.eventName}", not this event.`);
  }

  const evInfo = { id: found.eventId, title: found.eventName };
  const link = { uid: user.uid, name };
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
  registration.qr_payload = registrationQrPayload(registration);

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
    } catch (err) {
      throw friendlyError(err, "Could not join the team. Please try again.");
    }
    // The join is committed; a failed profile update must not report it as failed.
    try {
      await setDoc(
        doc(firebaseFirestore, "users", user.uid),
        {
          registeredEvents: arrayUnion(evInfo.title),
          registeredEventIds: arrayUnion(evInfo.id),
          displayName: name,
          name,
          ...(phone ? { phone } : {}),
          ...(college ? { college } : {}),
          ...(year ? { year } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Joined the team, but the profile could not be updated:", err);
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

  user.displayName = name;
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
    const { doc, getDoc } = fsMod;
    const snap = await getDoc(doc(firebaseFirestore, "team_codes", code));
    return snap.exists() ? getDocData("teams", snap.data().teamId) : null;
  }
  return demoList("teams").find((t) => t.teamCode === code) || null;
}

async function generateUniqueTeamCode(name) {
  let prefix = String(name).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
  if (prefix.length < 2) prefix = "TEAM";
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}-${randomCode(6)}`;
    const taken = isLive()
      ? (await fsMod.getDoc(fsMod.doc(firebaseFirestore, "team_codes", code))).exists()
      : await findTeamByCode(code);
    if (!taken) return code;
  }
  throw new Error("Could not generate a team code. Please try again.");
}

/**
 * Effective booking status for a registration.
 * booked | pending | rejected
 */
// A payment counts only if `payerUid` paid it and it covers `eventId`.
export function paymentCovers(payment, eventId, payerUid) {
  return !!payment && payment.payerUid === payerUid && paymentItems(payment).some((i) => i.eventId === eventId);
}

// A team covers a registration only for its own event and its linked accounts.
export function teamCovers(team, registration) {
  return !!team && team.eventId === registration?.event_id && (team.memberUids || []).includes(registration.user_id);
}

export function bookingStatus(registration, payment, team) {
  const s = registration?.payment_status;
  if (s === PAYMENT_STATUS.FREE) return "booked";
  if (s === PAYMENT_STATUS.TEAM) {
    if (!teamCovers(team, registration)) return "pending";
    const ts = team.paymentStatus;
    if (!ts || ts === "free" || ts === "paid" || ts === "verified") return "booked";
    return ts === "rejected" ? "rejected" : "pending";
  }
  const ps = (paymentCovers(payment, registration?.event_id, registration?.user_id) ? payment.status : null) || s;
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
      throw friendlyError(err, "Could not update the Transaction ID. Please try again.");
    }
  } else {
    const p = demoGet("payments", paymentIdValue);
    if (!p || p.payerUid !== user.uid) throw new Error("Payment not found.");
    demoSet("payments", paymentIdValue, { ...p, ...patch });
  }
  return { success: true };
}

// ----------------------------------------------------------------------------
// RAZORPAY CHECKOUT (test mode, no server: pay first, then checkoutCart saves
// the registration with the Razorpay payment id for the fest team to verify)
// ----------------------------------------------------------------------------

let razorpayScript = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScript) {
    razorpayScript = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        razorpayScript = null;
        s.remove();
        reject(new Error("Couldn't load the payment window. Check your connection and try again."));
      };
      document.head.appendChild(s);
    });
  }
  return razorpayScript;
}

/**
 * Open Razorpay Checkout for `amountRupees`. Resolves { status: "paid",
 * paymentId } or { status: "dismissed" } (window closed, nothing charged);
 * rejects with Razorpay's reason if the payment failed.
 */
export async function payWithRazorpay({ amountRupees, description = "", prefill = {}, events = [] } = {}) {
  await initFirebase();
  if (!isLive()) throw new Error("Online payment isn't available in demo mode.");
  const user = requireUser();
  if (!isRazorpayEnabled()) throw new Error("Online payment isn't open yet.");
  const paise = Math.round(Number(amountRupees) * 100);
  if (!(paise > 0)) throw new Error("Nothing to pay.");
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    let settled = false;
    let lastFailure = null; // Razorpay lets people retry inside the window
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    const rzp = new window.Razorpay({
      key: FEST_CONFIG.razorpay.keyId,
      amount: paise,
      currency: "INR",
      name: "Chaitanya 2k26",
      description: String(description).slice(0, 255),
      prefill: { name: prefill.name || "", email: prefill.email || "", contact: prefill.phone || prefill.contact || "" },
      notes: { uid: user.uid, events: events.join(",").slice(0, 250) },
      theme: { color: "#000000" },
      handler: (res) => finish(resolve, { status: "paid", paymentId: res.razorpay_payment_id }),
      modal: {
        ondismiss: () => (lastFailure ? finish(reject, new Error(lastFailure)) : finish(resolve, { status: "dismissed" })),
      },
    });
    rzp.on("payment.failed", (resp) => {
      lastFailure = resp?.error?.description || "Payment failed. Please try again.";
    });
    rzp.open();
  });
}

export function isEventRegistered(eventIdOrTitle) {
  const user = currentUser;
  if (!user || !eventIdOrTitle) return false;
  const target = String(eventIdOrTitle).toLowerCase().trim();
  const ids = (user.registeredEventIds || []).map((x) => String(x).toLowerCase());
  const titles = (user.registeredEvents || []).map((x) => String(x).toLowerCase().trim());
  return ids.includes(target) || titles.includes(target);
}

export function isRegisteredForAnyEvent() {
  return EVENTS_DATA.some((ev) => isEventRegistered(ev.id));
}

/**
 * Accommodation booking state for buttons/banners: { state, label }.
 * state: "booked" | "closed" | "soon" | "needs-event" | "open".
 * Signed out counts as "open" (the booking action asks them to sign in).
 */
export function accommodationState() {
  if (isEventRegistered(ACCOMMODATION.id)) return { state: "booked", label: "BOOKED" };
  if (isRegistrationPaused()) return { state: "soon", label: "BOOKING OPENS SOON" };
  if (!isRegistrationOpen(ACCOMMODATION) || isPastDeadline(ACCOMMODATION)) return { state: "closed", label: "BOOKING CLOSED" };
  if (!isPaymentConfigured() && !isRazorpayEnabled()) return { state: "soon", label: "BOOKING OPENS SOON" };
  if (currentUser && !isRegisteredForAnyEvent() && !getCartItems().some((i) => !i.event.isAccommodation)) {
    return { state: "needs-event", label: "REGISTER FOR AN EVENT FIRST" };
  }
  return { state: "open", label: `BOOK FOR ₹${ACCOMMODATION.entryFeeNum}` };
}

// ----------------------------------------------------------------------------
// DEREGISTRATION & PROFILE DELETION
// ----------------------------------------------------------------------------

// Registrations a participant may cancel themselves. Paid bookings (pending or
// verified) keep their payment trail, so organisers handle those.
const SELF_CANCELLABLE = [PAYMENT_STATUS.FREE, PAYMENT_STATUS.TEAM, PAYMENT_STATUS.REJECTED];

// payment: the registration's payment doc, when known. A rejected payment
// whose UTR was resubmitted is back to pending_verification while the
// registration still says "rejected": cancelling then would strand the money.
export function canCancelRegistration(registration, payment = null) {
  if (registration?.payment_status === PAYMENT_STATUS.REJECTED && payment?.status === PAYMENT_STATUS.PENDING) return false;
  return SELF_CANCELLABLE.includes(registration?.payment_status);
}

/**
 * Cancel the signed-in user's registration for one event. The registration is
 * deleted (not just marked cancelled) so the user can register again later.
 * A team leader's team is removed with it, but only while no teammate has
 * linked their account; a teammate is simply taken off the team.
 */
export async function cancelRegistration(eventId) {
  const user = requireUser();
  const regId = registrationId(eventId, user.uid);
  const registration = await getDocData("registrations", regId);
  const title = registration?.event_title || getEventById(eventId)?.title || eventId;

  const payment =
    registration?.payment_status === PAYMENT_STATUS.REJECTED && registration.payment_id
      ? await getDocData("payments", registration.payment_id)
      : null;
  if (registration && !canCancelRegistration(registration, payment)) {
    throw new Error(`Your ${title} registration includes a payment, so it can't be cancelled online. Please contact the fest team.`);
  }

  let team = null;
  let teamAction = null; // "delete" | "leave"
  if (registration?.team_id) {
    team = await getDocData("teams", registration.team_id);
    if (team && team.leaderUid === user.uid) {
      const others = (team.linkedMembers || []).filter((m) => m.uid !== user.uid);
      if (others.length) {
        throw new Error(
          `${others.map((m) => m.name).join(", ")} ${others.length > 1 ? "have" : "has"} joined your team for ${title}. Ask them to deregister first, or contact the fest team.`
        );
      }
      teamAction = "delete";
    } else if (team && (team.memberUids || []).includes(user.uid)) {
      teamAction = "leave";
    }
  }

  if (isLive()) {
    const { doc, writeBatch, arrayRemove, serverTimestamp } = fsMod;
    const batch = writeBatch(firebaseFirestore);
    if (registration) batch.delete(doc(firebaseFirestore, "registrations", regId));
    if (teamAction === "delete") {
      batch.delete(doc(firebaseFirestore, "teams", team.teamId));
      if (team.teamCode) batch.delete(doc(firebaseFirestore, "team_codes", team.teamCode));
    }
    if (teamAction === "leave") {
      batch.update(doc(firebaseFirestore, "teams", team.teamId), {
        memberUids: team.memberUids.filter((uid) => uid !== user.uid),
        linkedMembers: (team.linkedMembers || []).filter((m) => m.uid !== user.uid),
      });
    }
    batch.set(
      doc(firebaseFirestore, "users", user.uid),
      {
        registeredEvents: arrayRemove(title),
        registeredEventIds: arrayRemove(eventId),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    try {
      await batch.commit();
    } catch (err) {
      throw friendlyError(err, "Could not cancel the registration. Please try again.");
    }
  } else {
    const db = demoDb();
    if (db.registrations) delete db.registrations[regId];
    if (teamAction === "delete" && db.teams) delete db.teams[team.teamId];
    if (teamAction === "leave" && db.teams?.[team.teamId]) {
      const t = db.teams[team.teamId];
      t.memberUids = (t.memberUids || []).filter((uid) => uid !== user.uid);
      t.linkedMembers = (t.linkedMembers || []).filter((m) => m.uid !== user.uid);
    }
    demoSave(db);
  }

  user.registeredEvents = (user.registeredEvents || []).filter((t) => t !== title);
  user.registeredEventIds = (user.registeredEventIds || []).filter((id) => id !== eventId);
  if (!isLive()) demoSet("users", user.uid, { ...user });
  persistDemoUser();
  notifyListeners();
  return { success: true, eventId, title };
}

/**
 * Delete the signed-in user's profile: cancel every registration, delete the
 * users/{uid} document and the sign-in account, then sign out. Signing in
 * again starts a brand-new profile.
 */
export async function deleteMyProfile() {
  const user = requireUser();
  const regs = await getMyRegistrations();

  const locked = regs.filter((r) => !canCancelRegistration(r.registration, r.payment));
  if (locked.length) {
    throw new Error(
      `You have paid registrations (${locked.map((r) => r.registration.event_title).join(", ")}). Please contact the fest team to cancel those before deleting your profile.`
    );
  }
  // Fails early (nothing deleted yet) if a team you lead has linked teammates.
  for (const r of regs) {
    const team = r.team;
    if (team && team.leaderUid === user.uid && (team.linkedMembers || []).some((m) => m.uid !== user.uid)) {
      throw new Error(`Teammates have joined your team for ${r.registration.event_title}. Ask them to deregister first, or contact the fest team.`);
    }
  }
  for (const r of regs) await cancelRegistration(r.registration.event_id);

  if (isLive()) {
    const { doc, deleteDoc } = fsMod;
    try {
      await deleteDoc(doc(firebaseFirestore, "users", user.uid));
    } catch (err) {
      throw friendlyError(err, "Your registrations were cancelled, but the profile could not be deleted. Please try again.");
    }
    // Remove the sign-in account too. Firebase asks for a recent sign-in
    // before deleting an account, so confirm with Google once if needed.
    const fbUser = firebaseAuth.currentUser;
    if (fbUser) {
      try {
        await authMod.deleteUser(fbUser);
      } catch (err) {
        if (err?.code === "auth/requires-recent-login") {
          try {
            await authMod.reauthenticateWithPopup(fbUser, new authMod.GoogleAuthProvider());
            await authMod.deleteUser(fbUser);
          } catch (e) {
            // Profile data is already gone; signing out is enough to start over.
          }
        }
      }
    }
  } else {
    const db = demoDb();
    if (db.users) delete db.users[user.uid];
    demoSave(db);
  }

  await signOutUser();
  return { success: true };
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
    // Control characters (keeping tab/newline) would break the admin's Excel export.
    message: String(queryData.message || queryData.query || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 5000),
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

// Admin: create the team_codes lookup for teams made before it existed.
export async function backfillTeamCodes(teams) {
  if (!isLive()) return 0;
  const { doc, writeBatch } = fsMod;
  const todo = teams.filter((t) => t.teamCode && t.teamId);
  for (let i = 0; i < todo.length; i += 400) {
    const batch = writeBatch(firebaseFirestore);
    todo.slice(i, i + 400).forEach((t) =>
      batch.set(doc(firebaseFirestore, "team_codes", t.teamCode), { teamId: t.teamId, eventId: t.eventId })
    );
    await batch.commit();
  }
  return todo.length;
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
 * Admin: mark a contact-form query "open" or "resolved".
 */
export async function setQueryStatus(query, status) {
  const admin = requireAdmin();
  if (!["open", "resolved"].includes(status)) throw new Error("Unknown status.");
  const id = query.id || query._docId;
  const patch = { status, updated_at: nowIso(), resolved_by: status === "resolved" ? admin.email : null };
  if (isLive()) {
    const { doc, updateDoc } = fsMod;
    try {
      await updateDoc(doc(firebaseFirestore, "queries", id), patch);
    } catch (err) {
      throw friendlyError(err, "Could not update the query.");
    }
  } else {
    demoUpdate("queries", id, patch);
  }
  return { ...query, ...patch };
}

// Admin security cleanup: overwrite one top-level field, or delete a doc.
const CLEANUP_COLLECTIONS = ["users", "teams", "registrations", "payments", "queries"];

export async function adminSetField(col, id, field, value) {
  requireAdmin();
  if (!CLEANUP_COLLECTIONS.includes(col) || !id || !field) throw new Error("Unknown document.");
  if (isLive()) {
    const { doc, updateDoc } = fsMod;
    try {
      await updateDoc(doc(firebaseFirestore, col, id), { [field]: value });
    } catch (err) {
      throw friendlyError(err, "Could not clean the field.");
    }
  } else {
    demoUpdate(col, id, { [field]: value });
  }
}

export async function adminDeleteDoc(col, id) {
  requireAdmin();
  if (!CLEANUP_COLLECTIONS.includes(col) || !id) throw new Error("Unknown document.");
  if (isLive()) {
    const { doc, deleteDoc } = fsMod;
    try {
      await deleteDoc(doc(firebaseFirestore, col, id));
    } catch (err) {
      throw friendlyError(err, "Could not delete the document.");
    }
  } else {
    const db = demoDb();
    if (db[col]) delete db[col][id];
    demoSave(db);
  }
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

  // Only the payer's own registration and team for each item; teamId is client-written.
  const ownTeam = (item) => item.teamId && item.teamId === `team_${item.eventId}_${payment.payerUid}`;

  if (isLive()) {
    const { doc, getDoc, writeBatch } = fsMod;
    const batch = writeBatch(firebaseFirestore);
    batch.update(doc(firebaseFirestore, "payments", payment.paymentId), patch);
    try {
      // update (not set+merge) so deregistered docs aren't recreated as stubs; skip missing ones.
      // Only docs that point back at THIS payment: items are client-written, so a
      // second ₹1 payment listing a ₹199 event must not mark that event paid.
      const linked = (d) => d.exists() && (d.data().payment_id ?? d.data().paymentId) === payment.paymentId;
      for (const item of items) {
        const regRef = doc(firebaseFirestore, "registrations", registrationId(item.eventId, payment.payerUid));
        if (linked(await getDoc(regRef))) batch.update(regRef, { payment_status: status });
        if (ownTeam(item)) {
          const teamRef = doc(firebaseFirestore, "teams", item.teamId);
          if (linked(await getDoc(teamRef))) batch.update(teamRef, { paymentStatus: teamStatus });
        }
      }
      await batch.commit();
    } catch (err) {
      throw friendlyError(err, "Could not update the payment.");
    }
  } else {
    demoUpdate("payments", payment.paymentId, patch);
    items.forEach((item) => {
      demoUpdate("registrations", registrationId(item.eventId, payment.payerUid), { payment_status: status });
      if (ownTeam(item)) demoUpdate("teams", item.teamId, { paymentStatus: teamStatus });
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

export async function rejectPayment(payment, reason = "Transaction ID not found / payment not received") {
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
