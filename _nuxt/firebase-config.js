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
  "chaitanyahptu@gmail.com"
];

export function isAdminUser(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === "chaitanyahptu@gmail.com";
}
