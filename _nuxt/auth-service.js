/**
 * ============================================================================
 * Chaitanya 2k26 — Firebase Auth & Firestore Service
 * ============================================================================
 * Provides Google Sign-In, Attendee Registration, Cloud Firestore user sync,
 * Admin detection, and reactive auth state management.
 */

import {
  getFirebaseConfig,
  isFirebaseConfigured,
  isAdminUser,
} from "./firebase-config.js";

// Global singleton state
let firebaseApp = null;
let firebaseAuth = null;
let firebaseFirestore = null;
let firebaseAnalytics = null;
let currentUser = null;
let isInitialized = false;
let authListeners = [];

// Local cache key
const DEMO_USER_STORAGE_KEY = "chaitanya_demo_user";
const ATTENDEES_STORAGE_KEY = "chaitanya_attendees_list";

/**
 * Initialize Firebase dynamically from official Google CDN ESM modules
 */
export async function initFirebase() {
  if (isInitialized) return { app: firebaseApp, auth: firebaseAuth, db: firebaseFirestore, analytics: firebaseAnalytics };

  const config = getFirebaseConfig();

  if (isFirebaseConfigured(config)) {
    try {
      const { initializeApp, getApps, getApp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
      );
      const {
        getAuth,
        GoogleAuthProvider,
        signInWithPopup,
        signOut,
        onAuthStateChanged,
      } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
      );
      const {
        getFirestore,
        doc,
        setDoc,
        getDoc,
        collection,
        getDocs,
        serverTimestamp,
      } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
      );

      firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
      firebaseAuth = getAuth(firebaseApp);
      firebaseFirestore = getFirestore(firebaseApp);

      // Initialize Firebase Analytics if measurementId is provided and environment is supported
      if (config.measurementId) {
        try {
          const { getAnalytics, isSupported } = await import(
            "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js"
          );
          if (await isSupported()) {
            firebaseAnalytics = getAnalytics(firebaseApp);
          }
        } catch (analyticsErr) {
          console.info("Firebase analytics not available in current environment:", analyticsErr);
        }
      }

      // Listen to real Firebase Auth State
      onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser) {
          // Fetch or populate profile from Firestore
          const userDocRef = doc(firebaseFirestore, "users", fbUser.uid);
          let profile = {};
          try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              profile = docSnap.data();
            }
          } catch (err) {
            console.warn("Could not fetch user document from Firestore:", err);
          }

          const role = isAdminUser(fbUser.email) ? "admin" : "attendee";

          currentUser = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || "Chaitanya Attendee",
            email: fbUser.email,
            photoURL: fbUser.photoURL || "/images/icons/textFace.svg",
            role: role,
            college: profile.college || "",
            phone: profile.phone || "",
            registeredEvents: profile.registeredEvents || [],
            isDemo: false,
          };
        } else {
          currentUser = null;
        }
        notifyListeners();
      });

      isInitialized = true;
      return { app: firebaseApp, auth: firebaseAuth, db: firebaseFirestore, analytics: firebaseAnalytics };
    } catch (err) {
      console.error("Failed to load Firebase SDK modules:", err);
    }
  }

  // If not configured with live credentials, restore any demo session from localStorage
  try {
    const savedDemo = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    if (savedDemo) {
      currentUser = JSON.parse(savedDemo);
    }
  } catch (e) {}

  isInitialized = true;
  notifyListeners();
  return { app: null, auth: null, db: null };
}

/**
 * Sign in using Google Authentication
 */
export async function signInWithGoogle(extraDetails = {}) {
  await initFirebase();
  const config = getFirebaseConfig();

  if (isFirebaseConfigured(config) && firebaseAuth) {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
      );
      const { doc, setDoc, getDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
      );

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(firebaseAuth, provider);
      const fbUser = result.user;

      // Check existing profile or register new attendee document
      const userRef = doc(firebaseFirestore, "users", fbUser.uid);
      const snap = await getDoc(userRef);
      const isNew = !snap.exists();

      const role = isAdminUser(fbUser.email) ? "admin" : "attendee";
      const userData = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || "Fest Attendee",
        email: fbUser.email,
        photoURL: fbUser.photoURL,
        role: role,
        college: extraDetails.college || (isNew ? "" : snap.data()?.college || ""),
        phone: extraDetails.phone || (isNew ? "" : snap.data()?.phone || ""),
        registeredEvents: isNew ? [] : (snap.data()?.registeredEvents || []),
        lastLoginAt: serverTimestamp(),
      };

      if (isNew) {
        userData.createdAt = serverTimestamp();
      }

      await setDoc(userRef, userData, { merge: true });

      currentUser = {
        ...userData,
        isDemo: false,
      };
      if (typeof window !== "undefined") {
        window.__chaitanyaCurrentUser = currentUser;
        try { sessionStorage.setItem("chaitanya_active_user", JSON.stringify(currentUser)); } catch (e) {}
      }
      notifyListeners();
      return { success: true, user: currentUser, isNew };
    } catch (error) {
      console.warn("Live Google Auth provider notice:", error.message || error);
      // Fallback gracefully to demo user if Google Auth provider isn't enabled yet on console
      const demoUser = {
        uid: "usr_" + Math.random().toString(36).substr(2, 9),
        displayName: extraDetails.displayName || "Aditya Sharma",
        email: extraDetails.email || "aditya.fest@chaitanya2k26.org",
        photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        role: isAdminUser(extraDetails.email) ? "admin" : "attendee",
        college: extraDetails.college || "Himachal Pradesh Technical University",
        phone: extraDetails.phone || "+91 98765 43210",
        registeredEvents: extraDetails.registeredEvents || [],
        isDemo: true,
      };
      currentUser = demoUser;
      if (typeof window !== "undefined") {
        window.__chaitanyaCurrentUser = demoUser;
        try { sessionStorage.setItem("chaitanya_active_user", JSON.stringify(demoUser)); } catch (e) {}
      }
      try {
        localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoUser));
        saveDemoAttendee(demoUser);
      } catch (e) {}
      notifyListeners();
      return { success: true, user: demoUser, isNew: true, isDemo: true };
    }
  } else {
    // Demo Mode: Allows immediate full UI testing if user hasn't added Firebase keys yet
    const demoUser = {
      uid: "demo_" + Math.random().toString(36).substr(2, 9),
      displayName: extraDetails.displayName || "Aditya Sharma",
      email: extraDetails.email || "aditya.fest@chaitanya2k26.org",
      photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
      role: isAdminUser(extraDetails.email) ? "admin" : "attendee",
      college: extraDetails.college || "Himachal Pradesh Technical University",
      phone: extraDetails.phone || "+91 98765 43210",
      registeredEvents: extraDetails.registeredEvents || [],
      isDemo: true,
    };

    currentUser = demoUser;
    if (typeof window !== "undefined") {
      window.__chaitanyaCurrentUser = demoUser;
      try { sessionStorage.setItem("chaitanya_active_user", JSON.stringify(demoUser)); } catch (e) {}
    }
    try {
      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoUser));
      saveDemoAttendee(demoUser);
    } catch (e) {}

    notifyListeners();
    return { success: true, user: demoUser, isNew: true, isDemo: true };
  }
}

/**
 * Sign out user
 */
export async function signOutUser() {
  if (firebaseAuth && !currentUser?.isDemo) {
    try {
      const { signOut } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
      );
      await signOut(firebaseAuth);
    } catch (e) {
      console.warn("Firebase sign out error:", e);
    }
  }

  currentUser = null;
  if (typeof window !== "undefined") {
    window.__chaitanyaCurrentUser = null;
    try { sessionStorage.removeItem("chaitanya_active_user"); } catch (e) {}
  }
  try {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  } catch (e) {}

  notifyListeners();
  return { success: true };
}

/**
 * Get active user
 */
export function getCurrentUser() {
  if (typeof window !== "undefined" && window.__chaitanyaCurrentUser !== undefined) {
    return window.__chaitanyaCurrentUser;
  }
  return currentUser;
}

export function setSimulatedUser(user) {
  currentUser = user;
  if (typeof window !== "undefined") {
    window.__chaitanyaCurrentUser = user;
    try {
      if (user) sessionStorage.setItem("chaitanya_active_user", JSON.stringify(user));
      else sessionStorage.removeItem("chaitanya_active_user");
    } catch (e) {}
  }
  notifyListeners();
}

if (typeof window !== "undefined") {
  window.__setSimulatedUser = setSimulatedUser;
  window.getCurrentUser = getCurrentUser;
  try {
    const saved = sessionStorage.getItem("chaitanya_active_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      window.__chaitanyaCurrentUser = currentUser;
    }
  } catch (e) {}
}

/**
 * Subscribe to Auth State changes (Pub/Sub)
 */
export function subscribeAuthState(callback) {
  if (typeof callback === "function") {
    authListeners.push(callback);
    // Immediately invoke with current state
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

/**
 * Fetch all registered attendees (for Admin Panel)
 */
export async function getRegisteredAttendees() {
  const activeUser = getCurrentUser();
  if (!activeUser || !isAdminUser(activeUser.email)) {
    console.warn("Access Denied: getRegisteredAttendees called without authorized admin privileges.");
    return [];
  }

  await initFirebase();
  const config = getFirebaseConfig();

  if (isFirebaseConfigured(config) && firebaseFirestore && !activeUser.isDemo) {
    try {
      const { collection, getDocs } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
      );
      const fetchPromise = getDocs(collection(firebaseFirestore, "users"));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firestore timeout")), 2500)
      );
      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      if (list.length > 0) return list;
    } catch (err) {
      console.warn("Firestore attendees load note:", err.message || err);
    }
  }

  // Fallback demo attendees for previewing the Admin Table
  return getDemoAttendees();
}

export function getDemoAttendees() {
  try {
    const raw = localStorage.getItem(ATTENDEES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  const defaults = [
    {
      uid: "usr_101",
      displayName: "Aditya Sharma",
      email: "chaitanyahptu@gmail.com",
      role: "admin",
      college: "HPTU Hamirpur",
      phone: "+91 98160 00001",
      registeredEvents: ["AI Hackathon", "CTF & Coding"],
    },
    {
      uid: "usr_102",
      displayName: "Rohan Verma",
      email: "rohan.v@hptu.ac.in",
      role: "attendee",
      college: "HPTU Campus",
      phone: "+91 98162 11223",
      registeredEvents: ["Robowars & Drones"],
    },
    {
      uid: "usr_103",
      displayName: "Priya Thakur",
      email: "priya.thakur@gmail.com",
      role: "attendee",
      college: "NIT Hamirpur",
      phone: "+91 94180 55443",
      registeredEvents: ["Pitch Competition", "Product Management"],
    },
    {
      uid: "usr_104",
      displayName: "Amit Kumar",
      email: "amit.k@uiit.ac.in",
      role: "attendee",
      college: "UIIT Shimla",
      phone: "+91 98050 33221",
      registeredEvents: ["Esports Battles"],
    },
  ];

  try {
    localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(defaults));
  } catch (e) {}

  return defaults;
}

function saveDemoAttendee(user) {
  const list = getDemoAttendees();
  const exists = list.some((u) => u.email === user.email);
  if (!exists) {
    list.unshift(user);
    try {
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }
}

export function getFirebaseAnalytics() {
  return firebaseAnalytics;
}

// ----------------------------------------------------------------------------
// EVENT REGISTRATIONS, TEAMS & PAYMENTS SERVICE
// ----------------------------------------------------------------------------

const TEAMS_STORAGE_KEY = "chaitanya_teams_list";
const PAYMENTS_STORAGE_KEY = "chaitanya_payments_list";

/**
 * Register current user solo for an event
 */
export async function registerSoloForEvent(event, paymentDetails = {}) {
  const user = getCurrentUser();
  if (!user) throw new Error("Please sign in to register for events.");

  const eventTitle = typeof event === "string" ? event : event.title;
  const eventId = typeof event === "string" ? event.toLowerCase().replace(/[^a-z0-9]+/g, "-") : event.id;
  const entryFeeNum = typeof event === "object" ? (event.entryFeeNum || 0) : 0;

  // Add to registeredEvents if not present
  const currentEvents = Array.isArray(user.registeredEvents) ? [...user.registeredEvents] : [];
  if (!currentEvents.includes(eventTitle)) {
    currentEvents.push(eventTitle);
  }

  user.registeredEvents = currentEvents;

  // Create payment record if fee > 0 or if UTR provided
  let paymentRecord = null;
  if (entryFeeNum > 0 || paymentDetails.utr) {
    paymentRecord = {
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: eventId,
      eventTitle: eventTitle,
      teamId: null,
      teamName: null,
      payerUid: user.uid,
      payerName: user.displayName || "Participant",
      payerEmail: user.email,
      payerPhone: user.phone || paymentDetails.phone || "",
      amount: entryFeeNum,
      method: "upi_qr",
      transactionRef: (paymentDetails.utr || "").trim(),
      screenshotUrl: paymentDetails.screenshotUrl || null,
      status: entryFeeNum === 0 ? "verified" : "pending_verification",
      createdAt: new Date().toISOString(),
      verifiedAt: entryFeeNum === 0 ? new Date().toISOString() : null,
      verifiedBy: entryFeeNum === 0 ? "system_free" : null,
    };
    await savePaymentRecord(paymentRecord);
  }

  // Update user in Firestore
  await syncUserProfile(user);
  notifyListeners();

  return { success: true, user, payment: paymentRecord };
}

/**
 * Create a team and register for an event
 */
export async function createTeamForEvent(event, teamData, paymentDetails = {}) {
  const user = getCurrentUser();
  if (!user) throw new Error("Please sign in to register a team.");

  const eventTitle = typeof event === "string" ? event : event.title;
  const eventId = typeof event === "string" ? event.toLowerCase().replace(/[^a-z0-9]+/g, "-") : event.id;
  const entryFeeNum = typeof event === "object" ? (event.entryFeeNum || 0) : 0;

  const teamId = `team_${eventId}_${Date.now()}`;
  const teamCode = generateTeamCode(teamData.teamName || "TEAM");

  const membersList = [
    {
      uid: user.uid,
      name: user.displayName || "Team Leader",
      email: user.email,
      phone: user.phone || teamData.leaderPhone || "",
      college: user.college || teamData.college || "",
      role: "Leader",
    },
  ];

  // If additional member names/emails were entered in the form
  if (Array.isArray(teamData.teammates)) {
    teamData.teammates.forEach((tm, idx) => {
      if (tm.name && tm.name.trim()) {
        membersList.push({
          uid: tm.uid || `invited_${Date.now()}_${idx}`,
          name: tm.name.trim(),
          email: tm.email ? tm.email.trim() : "",
          phone: tm.phone ? tm.phone.trim() : "",
          college: tm.college ? tm.college.trim() : (user.college || ""),
          role: "Member",
        });
      }
    });
  }

  // Create payment record
  let paymentRecord = null;
  if (entryFeeNum > 0 || paymentDetails.utr) {
    paymentRecord = {
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: eventId,
      eventTitle: eventTitle,
      teamId: teamId,
      teamName: teamData.teamName,
      payerUid: user.uid,
      payerName: user.displayName || "Team Leader",
      payerEmail: user.email,
      payerPhone: user.phone || teamData.leaderPhone || "",
      amount: entryFeeNum,
      method: "upi_qr",
      transactionRef: (paymentDetails.utr || "").trim(),
      screenshotUrl: paymentDetails.screenshotUrl || null,
      status: entryFeeNum === 0 ? "verified" : "pending_verification",
      createdAt: new Date().toISOString(),
      verifiedAt: entryFeeNum === 0 ? new Date().toISOString() : null,
      verifiedBy: entryFeeNum === 0 ? "system_free" : null,
    };
    await savePaymentRecord(paymentRecord);
  }

  const teamRecord = {
    teamId,
    teamCode,
    eventId,
    eventName: eventTitle,
    teamName: teamData.teamName.trim(),
    leaderUid: user.uid,
    leaderName: user.displayName || "Team Leader",
    leaderEmail: user.email,
    leaderPhone: user.phone || teamData.leaderPhone || "",
    college: user.college || teamData.college || "",
    members: membersList,
    teamSize: membersList.length,
    maxTeamSize: typeof event === "object" ? (event.maxTeam || 4) : 4,
    paymentStatus: entryFeeNum === 0 ? "free" : "pending",
    paymentId: paymentRecord ? paymentRecord.paymentId : null,
    registeredAt: new Date().toISOString(),
  };

  await saveTeamRecord(teamRecord);

  // Add event to leader's profile
  const currentEvents = Array.isArray(user.registeredEvents) ? [...user.registeredEvents] : [];
  if (!currentEvents.includes(eventTitle)) {
    currentEvents.push(eventTitle);
  }
  user.registeredEvents = currentEvents;
  await syncUserProfile(user);
  notifyListeners();

  return { success: true, team: teamRecord, payment: paymentRecord };
}

/**
 * Join an existing team using a 6-character team code
 */
export async function joinTeamWithCode(teamCode) {
  const user = getCurrentUser();
  if (!user) throw new Error("Please sign in to join a team.");

  if (!teamCode || !teamCode.trim()) throw new Error("Please enter a valid team code.");
  const code = teamCode.trim().toUpperCase();

  const allTeams = await getAllTeams();
  const team = allTeams.find((t) => (t.teamCode || "").toUpperCase() === code);

  if (!team) throw new Error(`No team found with code "${code}". Please check with your team leader.`);

  if (team.members && team.members.length >= (team.maxTeamSize || 4)) {
    throw new Error(`Team "${team.teamName}" is already full (${team.members.length}/${team.maxTeamSize}).`);
  }

  // Check if already in team
  const alreadyMember = team.members && team.members.some((m) => m.uid === user.uid || m.email === user.email);
  if (alreadyMember) {
    throw new Error(`You are already a member of team "${team.teamName}".`);
  }

  // Add user to team
  team.members = team.members || [];
  team.members.push({
    uid: user.uid,
    name: user.displayName || "Teammate",
    email: user.email,
    phone: user.phone || "",
    college: user.college || team.college || "",
    role: "Member",
  });
  team.teamSize = team.members.length;

  await saveTeamRecord(team);

  // Add event to user profile
  const currentEvents = Array.isArray(user.registeredEvents) ? [...user.registeredEvents] : [];
  if (team.eventName && !currentEvents.includes(team.eventName)) {
    currentEvents.push(team.eventName);
  }
  user.registeredEvents = currentEvents;
  await syncUserProfile(user);
  notifyListeners();

  return { success: true, team };
}

/**
 * Unregister user from an event
 */
export async function unregisterFromEvent(eventIdOrTitle) {
  const user = getCurrentUser();
  if (!user || !user.registeredEvents) return { success: false };

  const target = eventIdOrTitle.toLowerCase().trim();
  user.registeredEvents = user.registeredEvents.filter(
    (ev) => ev.toLowerCase().trim() !== target && !ev.toLowerCase().includes(target)
  );

  await syncUserProfile(user);
  notifyListeners();
  return { success: true, user };
}

/**
 * Helper to check if active user is registered for an event
 */
export function isEventRegistered(eventIdOrTitle) {
  const user = getCurrentUser();
  if (!user || !Array.isArray(user.registeredEvents)) return false;
  const target = eventIdOrTitle.toLowerCase().trim();
  return user.registeredEvents.some(
    (ev) => ev.toLowerCase().trim() === target
  );
}

function withTimeout(promise, ms = 1500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore operation timeout")), ms)),
  ]);
}

/**
 * Sync user profile document
 */
async function syncUserProfile(user) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
      sessionStorage.setItem("chaitanya_active_user", JSON.stringify(user));
      window.__chaitanyaCurrentUser = user;
    } catch (e) {}
  }

  const config = getFirebaseConfig();
  if (isFirebaseConfigured(config) && firebaseFirestore && user.uid && !user.isDemo) {
    try {
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await withTimeout(setDoc(doc(firebaseFirestore, "users", user.uid), user, { merge: true }), 1500);
    } catch (e) {
      console.warn("Could not sync user profile to Firestore:", e.message || e);
    }
  }

  saveDemoAttendee(user);
}

/**
 * Save team record
 */
async function saveTeamRecord(team) {
  const teams = await getAllTeams();
  const index = teams.findIndex((t) => t.teamId === team.teamId);
  if (index >= 0) {
    teams[index] = team;
  } else {
    teams.unshift(team);
  }

  try {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch (e) {}

  const config = getFirebaseConfig();
  const user = getCurrentUser();
  if (isFirebaseConfigured(config) && firebaseFirestore && !user?.isDemo) {
    import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
      .then(({ doc, setDoc }) => withTimeout(setDoc(doc(firebaseFirestore, "teams", team.teamId), team, { merge: true }), 1500))
      .catch((e) => console.warn("Firestore teams save note:", e.message || e));
  }
}

/**
 * Save payment record
 */
async function savePaymentRecord(payment) {
  const payments = await getAllPayments();
  const index = payments.findIndex((p) => p.paymentId === payment.paymentId);
  if (index >= 0) {
    payments[index] = payment;
  } else {
    payments.unshift(payment);
  }

  try {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  } catch (e) {}

  const config = getFirebaseConfig();
  const user = getCurrentUser();
  if (isFirebaseConfigured(config) && firebaseFirestore && !user?.isDemo) {
    import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
      .then(({ doc, setDoc }) => withTimeout(setDoc(doc(firebaseFirestore, "payments", payment.paymentId), payment, { merge: true }), 1500))
      .catch((e) => console.warn("Firestore payments save note:", e.message || e));
  }
}

/**
 * Fetch all teams (for Admin & Teammate Lookups)
 */
export async function getAllTeams() {
  try {
    const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  await initFirebase();
  const config = getFirebaseConfig();
  const user = getCurrentUser();
  if (isFirebaseConfigured(config) && firebaseFirestore && !user?.isDemo) {
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap = await withTimeout(getDocs(collection(firebaseFirestore, "teams")), 1500);
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      if (list.length > 0) {
        try { localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
        return list;
      }
    } catch (e) {
      console.warn("Could not fetch teams from Firestore, using local cache:", e.message || e);
    }
  }

  const demoTeams = getDemoTeams();
  try { localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(demoTeams)); } catch (e) {}
  return demoTeams;
}

/**
 * Fetch all payments (for Admin Payment Verification)
 */
export async function getAllPayments() {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  await initFirebase();
  const config = getFirebaseConfig();
  const user = getCurrentUser();
  if (isFirebaseConfigured(config) && firebaseFirestore && !user?.isDemo) {
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap = await withTimeout(getDocs(collection(firebaseFirestore, "payments")), 1500);
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      if (list.length > 0) {
        try { localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
        return list;
      }
    } catch (e) {
      console.warn("Could not fetch payments from Firestore, using local cache:", e.message || e);
    }
  }

  const demoPayments = getDemoPayments();
  try { localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(demoPayments)); } catch (e) {}
  return demoPayments;
}

/**
 * Admin: Approve payment and issue verified pass
 */
export async function approvePayment(paymentId) {
  const activeUser = getCurrentUser();
  if (!activeUser || !isAdminUser(activeUser.email)) {
    throw new Error("Unauthorized: Admin privileges required.");
  }

  const payments = await getAllPayments();
  const payment = payments.find((p) => p.paymentId === paymentId);
  if (!payment) throw new Error("Payment record not found.");

  payment.status = "verified";
  payment.verifiedAt = new Date().toISOString();
  payment.verifiedBy = activeUser.email;

  await savePaymentRecord(payment);

  // If team payment, update team payment status to paid
  if (payment.teamId) {
    const teams = await getAllTeams();
    const team = teams.find((t) => t.teamId === payment.teamId);
    if (team) {
      team.paymentStatus = "paid";
      await saveTeamRecord(team);
    }
  }

  return { success: true, payment };
}

/**
 * Admin: Reject payment
 */
export async function rejectPayment(paymentId, reason = "Invalid UTR / Payment Not Received") {
  const activeUser = getCurrentUser();
  if (!activeUser || !isAdminUser(activeUser.email)) {
    throw new Error("Unauthorized: Admin privileges required.");
  }

  const payments = await getAllPayments();
  const payment = payments.find((p) => p.paymentId === paymentId);
  if (!payment) throw new Error("Payment record not found.");

  payment.status = "rejected";
  payment.rejectionReason = reason;
  payment.rejectedAt = new Date().toISOString();
  payment.rejectedBy = activeUser.email;

  await savePaymentRecord(payment);
  return { success: true, payment };
}

function generateTeamCode(name) {
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "FEST";
  const num = Math.floor(100 + Math.random() * 900);
  return `${clean}-${num}`;
}

export function getDemoTeams() {
  return [
    {
      teamId: "team_ai_hack_01",
      teamCode: "BYTE-408",
      eventId: "ai-hackathon",
      eventName: "AI Innovation Hackathon",
      teamName: "ByteBusters",
      leaderUid: "usr_101",
      leaderName: "Aditya Sharma",
      leaderEmail: "chaitanyahptu@gmail.com",
      leaderPhone: "+91 98160 00001",
      college: "HPTU Hamirpur",
      members: [
        { uid: "usr_101", name: "Aditya Sharma", email: "chaitanyahptu@gmail.com", phone: "+91 98160 00001", college: "HPTU Hamirpur", role: "Leader" },
        { uid: "usr_102", name: "Rohan Verma", email: "rohan.v@hptu.ac.in", phone: "+91 98162 11223", college: "HPTU Campus", role: "Member" },
      ],
      teamSize: 2,
      maxTeamSize: 4,
      paymentStatus: "paid",
      paymentId: "pay_demo_01",
      registeredAt: "2026-03-20T10:00:00Z",
    },
    {
      teamId: "team_robo_01",
      teamCode: "TITN-912",
      eventId: "robowars-30kg",
      eventName: "RoboWars: 30kg Metal Clash",
      teamName: "Steel Titans",
      leaderUid: "usr_104",
      leaderName: "Amit Kumar",
      leaderEmail: "amit.k@uiit.ac.in",
      leaderPhone: "+91 98050 33221",
      college: "UIIT Shimla",
      members: [
        { uid: "usr_104", name: "Amit Kumar", email: "amit.k@uiit.ac.in", phone: "+91 98050 33221", college: "UIIT Shimla", role: "Leader" },
        { uid: "usr_105", name: "Vikas Rana", email: "vikas@hptu.ac.in", phone: "+91 98050 44556", college: "HPTU Hamirpur", role: "Member" },
        { uid: "usr_106", name: "Sahil J.", email: "sahil@hptu.ac.in", phone: "+91 94183 22110", college: "HPTU Hamirpur", role: "Member" },
      ],
      teamSize: 3,
      maxTeamSize: 5,
      paymentStatus: "pending",
      paymentId: "pay_demo_02",
      registeredAt: "2026-03-20T11:45:00Z",
    },
  ];
}

export function getDemoPayments() {
  return [
    {
      paymentId: "pay_demo_01",
      eventId: "ai-hackathon",
      eventTitle: "AI Innovation Hackathon",
      teamId: "team_ai_hack_01",
      teamName: "ByteBusters",
      payerUid: "usr_101",
      payerName: "Aditya Sharma",
      payerEmail: "chaitanyahptu@gmail.com",
      payerPhone: "+91 98160 00001",
      amount: 400,
      method: "upi_qr",
      transactionRef: "408192837192",
      status: "verified",
      createdAt: "2026-03-20T10:02:00Z",
      verifiedAt: "2026-03-20T10:15:00Z",
      verifiedBy: "chaitanyahptu@gmail.com",
    },
    {
      paymentId: "pay_demo_02",
      eventId: "robowars-30kg",
      eventTitle: "RoboWars: 30kg Metal Clash",
      teamId: "team_robo_01",
      teamName: "Steel Titans",
      payerUid: "usr_104",
      payerName: "Amit Kumar",
      payerEmail: "amit.k@uiit.ac.in",
      payerPhone: "+91 98050 33221",
      amount: 500,
      method: "upi_qr",
      transactionRef: "408189320114",
      status: "pending_verification",
      createdAt: "2026-03-20T11:46:00Z",
      verifiedAt: null,
      verifiedBy: null,
    },
    {
      paymentId: "pay_demo_03",
      eventId: "valorant-5v5",
      eventTitle: "Valorant 5v5 Campus Warfare",
      teamId: "team_val_01",
      teamName: "Phantom Phantoms",
      payerUid: "usr_103",
      payerName: "Priya Thakur",
      payerEmail: "priya.thakur@gmail.com",
      payerPhone: "+91 94180 55443",
      amount: 500,
      method: "upi_qr",
      transactionRef: "408177492019",
      status: "pending_verification",
      createdAt: "2026-03-20T12:20:00Z",
      verifiedAt: null,
      verifiedBy: null,
    },
  ];
}


