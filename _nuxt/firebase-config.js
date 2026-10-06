/**
 * ============================================================================
 * Chaitanya 2k26 — Firebase Configuration
 * ============================================================================
 * Replace the placeholder values below with your Firebase Project credentials
 * obtained from the Firebase Console (https://console.firebase.google.com/):
 *
 * Project Settings > General > Your Apps > Web App > Firebase SDK snippet > Config
 */

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBL3ZiGFe3Q7eEnnikto1wnfDxVj0Op3I8",
  authDomain: "chaitainya-hptu.firebaseapp.com",
  projectId: "chaitainya-hptu",
  storageBucket: "chaitainya-hptu.firebasestorage.app",
  messagingSenderId: "453300095500",
  appId: "1:453300095500:web:0933b038d3580842ddbc29",
  measurementId: "G-1JS13R6GY0"
};

// window.__FIREBASE_CONFIG__ can override the project for local testing.
// (A persistent localStorage override was removed: it let any script that
// ran once redirect all future sign-ins to another Firebase project.)
export function getFirebaseConfig() {
  if (typeof window !== "undefined" && window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.apiKey) {
    return window.__FIREBASE_CONFIG__;
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function isFirebaseConfigured(config = getFirebaseConfig()) {
  return (
    Boolean(config.apiKey) &&
    !config.apiKey.includes("YOUR_FIREBASE_API_KEY") &&
    Boolean(config.projectId) &&
    !config.projectId.includes("YOUR_PROJECT_ID")
  );
}

// Admin emails (UI only). Access is enforced by isAdmin() in firestore.rules;
// keep both lists in sync.
export const ADMIN_EMAILS = [
  "chaitanyahptu@gmail.com",
  "adityaverma200911@gmail.com",
  "manaskapoor033@gmail.com",
  "admin@chaitanya2k26.org",
];

export function isAdminUser(email) {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === clean);
}
