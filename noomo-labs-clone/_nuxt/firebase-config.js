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
  apiKey: "AIzaSyAl6NQ4jRdiL5mmBlBXPXPpnFkqzFE493U",
  authDomain: "samachar-setu-88qx2.firebaseapp.com",
  projectId: "samachar-setu-88qx2",
  storageBucket: "samachar-setu-88qx2.firebasestorage.app",
  messagingSenderId: "1054011658339",
  appId: "1:1054011658339:web:73111f322dfbde48a62856"
};

// Allows runtime override via window or localStorage for immediate testing
export function getFirebaseConfig() {
  if (typeof window !== "undefined") {
    if (window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.apiKey) {
      return window.__FIREBASE_CONFIG__;
    }
    try {
      const saved = localStorage.getItem("chaitanya_firebase_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apiKey && !parsed.apiKey.includes("YOUR_FIREBASE_API_KEY")) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not parse saved firebase config from localStorage", e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("chaitanya_firebase_config", JSON.stringify(config));
      window.__FIREBASE_CONFIG__ = config;
      return true;
    } catch (e) {
      console.error("Failed to save firebase config:", e);
      return false;
    }
  }
  return false;
}

export function isFirebaseConfigured(config = getFirebaseConfig()) {
  return (
    Boolean(config.apiKey) &&
    !config.apiKey.includes("YOUR_FIREBASE_API_KEY") &&
    Boolean(config.projectId) &&
    !config.projectId.includes("YOUR_PROJECT_ID")
  );
}

// Admin email with exclusive privileges to access fest registrant dashboards
export const ADMIN_EMAILS = [
  "chaitainyahptu@gmail.com"
];

export function isAdminUser(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === "chaitainyahptu@gmail.com";
}
