/**
 * ============================================================================
 * Chaitanya 2k26 — Firebase Auth & Firestore Service
 * ============================================================================
 * Google Sign-In, attendee profiles, event registrations, squads, UPI payment
 * submissions and admin verification.
 *
 * Cloud Firestore is the single source of truth. Every write is awaited and
 * errors are surfaced to the caller, so the UI never shows a "confirmed"
 * state for data that was not saved. Access control is enforced server-side
 * by firestore.rules; the admin checks here only decide what UI to show.
 *
 * Demo mode (local-only storage) is used ONLY when Firebase is not configured.
 */

import {
  getFirebaseConfig,
  isFirebaseConfigured,
  isAdminUser,
} from "./firebase-config.js";

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

// Legacy keys from the previous localStorage-first implementation. They held
// stale/seeded data and are cleared on startup so nothing reads them again.
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
    photoURL: fbUser.photoURL || "/images/icons/textFace.svg",
    role: isAdminUser(fbUser.email) ? "admin" : "attendee",
    college: "",
    phone: "",
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

  const profile = {
    uid: fbUser.uid,
    name: fbUser.displayName || existing.name || "Fest Attendee",
    displayName: fbUser.displayName || existing.displayName || "Fest Attendee",
    email: fbUser.email || "",
    photoURL: fbUser.photoURL || "",
    college: cleanText(extra.college || existing.college || ""),
    phone: cleanPhone(extra.phone || existing.phone || ""),
    registeredEvents: existing.registeredEvents || [],
    registeredEventIds: existing.registeredEventIds || [],
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) profile.createdAt = serverTimestamp();

  const needsWrite =
    !snap.exists() ||
    existing.email !== profile.email ||
    existing.displayName !== profile.displayName ||
    existing.photoURL !== profile.photoURL ||
    (extra.college && extra.college !== existing.college) ||
    (extra.phone && extra.phone !== existing.phone);

  if (needsWrite) await setDoc(ref, profile, { merge: true });

  return {
    ...baseProfile(fbUser),
    college: profile.college,
    phone: profile.phone,
    registeredEvents: profile.registeredEvents,
    registeredEventIds: profile.registeredEventIds,
  };
}

// ----------------------------------------------------------------------------
// AUTH
// ----------------------------------------------------------------------------

/**
 * Sign in with Google. `extraDetails` (college, phone) are saved on the
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
 * Update the signed-in user's own college / phone.
 */
export async function updateMyProfile({ college, phone } = {}) {
  const user = requireUser();
  const patch = {};
  if (college !== undefined) patch.college = cleanText(college);
  if (phone !== undefined) patch.phone = cleanPhone(phone);
  if (!Object.keys(patch).length) return user;

  if (isLive()) {
    const { doc, setDoc, serverTimestamp } = fsMod;
    await setDoc(doc(firebaseFirestore, "users", user.uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
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
// REGISTRATIONS, SQUADS & PAYMENTS
// ----------------------------------------------------------------------------

function registrationId(eventId, uid) {
  return `reg_${eventId}_${uid}`;
}

function paymentId(eventId, uid) {
  return `pay_${eventId}_${uid}`;
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

async function addEventToProfile(user, ev) {
  const titles = new Set(user.registeredEvents || []);
  const ids = new Set(user.registeredEventIds || []);
  titles.add(ev.title);
  ids.add(ev.id);
  user.registeredEvents = [...titles];
  user.registeredEventIds = [...ids];
}

function profileEventPatch(ev) {
  if (isLive()) {
    const { arrayUnion, serverTimestamp } = fsMod;
    return {
      registeredEvents: arrayUnion(ev.title),
      registeredEventIds: arrayUnion(ev.id),
      updatedAt: serverTimestamp(),
    };
  }
  return null;
}

/**
 * Solo registration. For paid events a 12-digit UTR is required and the
 * payment is created as "pending_verification" for the admin to verify.
 */
export async function registerSoloForEvent(ev, details = {}) {
  const user = requireUser();
  if (!ev || typeof ev !== "object") throw new Error("Unknown event.");

  const fee = Number(ev.entryFeeNum) || 0;
  const utr = String(details.utr || "").trim();
  if (fee > 0) assertUtr(utr);

  const phone = cleanPhone(details.phone || user.phone);
  const college = cleanText(details.college || user.college);
  if (!phone) throw new Error("Please enter your contact number.");
  if (!college) throw new Error("Please enter your college / institute.");

  const regId = registrationId(ev.id, user.uid);
  const payId = fee > 0 ? paymentId(ev.id, user.uid) : null;

  const registration = {
    id: regId,
    user_id: user.uid,
    user_name: user.displayName || "Participant",
    user_email: user.email,
    user_phone: phone,
    user_college: college,
    event_id: ev.id,
    event_title: ev.title,
    participation_type: "individual",
    team_id: null,
    team_code: null,
    registration_status: "registered",
    payment_status: fee > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.FREE,
    payment_id: payId,
    amount_due: fee,
    registration_qr_id: passId(ev.id, user.uid),
    registered_at: nowIso(),
  };

  const payment = fee > 0
    ? {
        paymentId: payId,
        eventId: ev.id,
        eventTitle: ev.title,
        teamId: null,
        teamName: null,
        payerUid: user.uid,
        payerName: user.displayName || "Participant",
        payerEmail: user.email,
        payerPhone: phone,
        amount: fee,
        method: "upi",
        transactionRef: utr,
        status: PAYMENT_STATUS.PENDING,
        createdAt: nowIso(),
        verifiedAt: null,
        verifiedBy: null,
      }
    : null;

  await writeRegistration({ user, ev, registration, payment, profilePatch: { phone, college } });
  return { success: true, registration, payment };
}

/**
 * Create a squad. The leader pays the team fee; teammates join with the code.
 */
export async function createTeamForEvent(ev, teamData = {}, details = {}) {
  const user = requireUser();
  if (!ev || typeof ev !== "object") throw new Error("Unknown event.");

  const teamName = cleanText(teamData.teamName, 60);
  const phone = cleanPhone(teamData.leaderPhone || user.phone);
  const college = cleanText(teamData.college || user.college);
  if (!teamName) throw new Error("Please enter your team name.");
  if (!phone) throw new Error("Please enter the team leader's contact number.");
  if (!college) throw new Error("Please enter your college / institute.");

  const fee = Number(ev.entryFeeNum) || 0;
  const utr = String(details.utr || "").trim();
  if (fee > 0) assertUtr(utr);

  const teamId = `team_${ev.id}_${user.uid}`;
  const teamCode = await generateUniqueTeamCode(teamName);
  const payId = fee > 0 ? paymentId(ev.id, user.uid) : null;

  // Team docs are readable by any signed-in user (needed to join by code),
  // so they hold names only; contact details live in private registrations.
  const leader = {
    uid: user.uid,
    name: user.displayName || "Team Leader",
    college,
    role: "Leader",
  };

  const team = {
    id: teamId,
    teamId,
    event_id: ev.id,
    eventId: ev.id,
    eventName: ev.title,
    team_name: teamName,
    teamName,
    team_code: teamCode,
    teamCode,
    leader_id: user.uid,
    leaderUid: user.uid,
    leaderName: leader.name,
    college,
    members: [leader],
    memberUids: [user.uid],
    teamSize: 1,
    minTeamSize: Number(ev.minTeam) || 1,
    maxTeamSize: Number(ev.maxTeam) || 4,
    paymentStatus: fee > 0 ? "pending" : "free",
    paymentId: payId,
    created_at: nowIso(),
    registeredAt: nowIso(),
  };

  const registration = {
    id: registrationId(ev.id, user.uid),
    user_id: user.uid,
    user_name: leader.name,
    user_email: user.email,
    user_phone: phone,
    user_college: college,
    event_id: ev.id,
    event_title: ev.title,
    participation_type: "team",
    team_id: teamId,
    team_code: teamCode,
    team_role: "leader",
    registration_status: "registered",
    payment_status: fee > 0 ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.FREE,
    payment_id: payId,
    amount_due: fee,
    registration_qr_id: passId(ev.id, user.uid),
    registered_at: nowIso(),
  };

  const payment = fee > 0
    ? {
        paymentId: payId,
        eventId: ev.id,
        eventTitle: ev.title,
        teamId,
        teamName,
        payerUid: user.uid,
        payerName: leader.name,
        payerEmail: user.email,
        payerPhone: phone,
        amount: fee,
        method: "upi",
        transactionRef: utr,
        status: PAYMENT_STATUS.PENDING,
        createdAt: nowIso(),
        verifiedAt: null,
        verifiedBy: null,
      }
    : null;

  await writeRegistration({ user, ev, registration, payment, team, profilePatch: { phone, college } });
  return { success: true, team, registration, payment };
}

/**
 * Join a squad using the leader's team code.
 */
export async function joinTeamWithCode(rawCode, ev = null, details = {}) {
  const user = requireUser();
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,6}-[A-Z0-9]{3,6}$/.test(code)) {
    throw new Error("Enter the team code exactly as your leader shared it (e.g. BYTE-4F8K).");
  }

  const phone = cleanPhone(details.phone || user.phone);
  const college = cleanText(details.college || user.college);

  const found = await findTeamByCode(code);
  if (!found) throw new Error(`No team found with code "${code}". Check the code with your team leader.`);
  if (ev && found.eventId !== ev.id) {
    throw new Error(`Team ${code} is registered for "${found.eventName}", not this event.`);
  }

  const member = {
    uid: user.uid,
    name: user.displayName || "Teammate",
    college: college || found.college || "",
    role: "Member",
  };

  const evInfo = { id: found.eventId, title: found.eventName };
  const registration = {
    id: registrationId(found.eventId, user.uid),
    user_id: user.uid,
    user_name: member.name,
    user_email: user.email,
    user_phone: phone,
    user_college: member.college,
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
    const { doc, runTransaction, setDoc, serverTimestamp } = fsMod;
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
          throw new Error(`Team "${t.teamName}" is full (${uids.length}/${t.maxTeamSize}).`);
        }
        tx.update(teamRef, {
          members: [...(t.members || []), member],
          memberUids: [...uids, user.uid],
          teamSize: uids.length + 1,
        });
        tx.set(regRef, registration);
      });
      await setDoc(
        doc(firebaseFirestore, "users", user.uid),
        { ...profileEventPatch(evInfo), ...(phone ? { phone } : {}), ...(college ? { college } : {}), updatedAt: serverTimestamp() },
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
    t.members.push(member);
    t.memberUids.push(user.uid);
    t.teamSize = t.memberUids.length;
    demoSet("teams", t.teamId, t);
    demoSet("registrations", registration.id, registration);
  }

  if (phone) user.phone = phone;
  if (college) user.college = college;
  await addEventToProfile(user, evInfo);
  if (!isLive()) demoSet("users", user.uid, { ...user });
  persistDemoUser();
  notifyListeners();
  return { success: true, team: found, registration };
}

async function writeRegistration({ user, ev, registration, payment, team, profilePatch }) {
  if (isLive()) {
    const { doc, getDoc, writeBatch, serverTimestamp } = fsMod;
    const regRef = doc(firebaseFirestore, "registrations", registration.id);
    try {
      const existing = await getDoc(regRef);
      if (existing.exists()) {
        throw new Error("You are already registered for this event.");
      }
      const batch = writeBatch(firebaseFirestore);
      if (payment) batch.set(doc(firebaseFirestore, "payments", payment.paymentId), payment);
      if (team) batch.set(doc(firebaseFirestore, "teams", team.teamId), team);
      batch.set(regRef, registration);
      batch.set(
        doc(firebaseFirestore, "users", user.uid),
        { ...profileEventPatch(ev), phone: profilePatch.phone, college: profilePatch.college, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await batch.commit();
    } catch (err) {
      throw friendlyError(err, "Registration could not be saved. Please try again.");
    }
  } else {
    if (demoGet("registrations", registration.id)) throw new Error("You are already registered for this event.");
    if (payment) demoSet("payments", payment.paymentId, payment);
    if (team) demoSet("teams", team.teamId, team);
    demoSet("registrations", registration.id, registration);
  }

  user.phone = profilePatch.phone;
  user.college = profilePatch.college;
  await addEventToProfile(user, ev);
  if (!isLive()) demoSet("users", user.uid, { ...user });
  persistDemoUser();
  notifyListeners();
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
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    const code = `${prefix}-${suffix}`;
    if (!(await findTeamByCode(code))) return code;
  }
  throw new Error("Could not generate a team code. Please try again.");
}

/**
 * The signed-in user's registration (and payment, if any) for one event.
 */
export async function getMyRegistration(eventId) {
  const user = currentUser;
  if (!user) return null;
  const regId = registrationId(eventId, user.uid);

  if (isLive()) {
    const { doc, getDoc } = fsMod;
    const regSnap = await getDoc(doc(firebaseFirestore, "registrations", regId));
    if (!regSnap.exists()) return null;
    const registration = regSnap.data();
    let payment = null;
    let team = null;
    if (registration.payment_id && registration.payment_status !== PAYMENT_STATUS.TEAM) {
      const paySnap = await getDoc(doc(firebaseFirestore, "payments", registration.payment_id));
      payment = paySnap.exists() ? paySnap.data() : null;
    }
    if (registration.team_id) {
      const teamSnap = await getDoc(doc(firebaseFirestore, "teams", registration.team_id));
      team = teamSnap.exists() ? teamSnap.data() : null;
    }
    return { registration, payment, team };
  }

  const registration = demoGet("registrations", regId);
  if (!registration) return null;
  return {
    registration,
    payment:
      registration.payment_id && registration.payment_status !== PAYMENT_STATUS.TEAM
        ? demoGet("payments", registration.payment_id)
        : null,
    team: registration.team_id ? demoGet("teams", registration.team_id) : null,
  };
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

async function setPaymentStatus(payment, status, extra) {
  const admin = requireAdmin();
  const patch = { status, ...extra };
  const regPatch = { payment_status: status };
  const teamPatch = payment.teamId ? { paymentStatus: status === PAYMENT_STATUS.VERIFIED ? "paid" : status } : null;
  const regId = registrationId(payment.eventId, payment.payerUid);

  if (isLive()) {
    const { doc, writeBatch } = fsMod;
    const batch = writeBatch(firebaseFirestore);
    batch.update(doc(firebaseFirestore, "payments", payment.paymentId), patch);
    batch.set(doc(firebaseFirestore, "registrations", regId), regPatch, { merge: true });
    if (teamPatch) batch.set(doc(firebaseFirestore, "teams", payment.teamId), teamPatch, { merge: true });
    try {
      await batch.commit();
    } catch (err) {
      throw friendlyError(err, "Could not update the payment.");
    }
  } else {
    demoUpdate("payments", payment.paymentId, patch);
    demoUpdate("registrations", regId, regPatch);
    if (teamPatch) demoUpdate("teams", payment.teamId, teamPatch);
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
    photoURL: "/images/icons/textFace.svg",
    role: isAdminUser(email) ? "admin" : "attendee",
    college: cleanText(extra.college),
    phone: cleanPhone(extra.phone),
    registeredEvents: [],
    registeredEventIds: [],
    isDemo: true,
  };
  demoSet("users", currentUser.uid, { ...currentUser });
  persistDemoUser();
  notifyListeners();
  return { success: true, user: currentUser, isDemo: true };
}
