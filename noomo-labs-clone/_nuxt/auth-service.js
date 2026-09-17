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
      notifyListeners();
      return { success: true, user: currentUser, isNew };
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
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
      registeredEvents: ["AI Hackathon 2026", "Drone Grand Prix"],
      isDemo: true,
    };

    currentUser = demoUser;
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

  if (isFirebaseConfigured(config) && firebaseFirestore) {
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
      email: "chaitainyahptu@gmail.com",
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

