# Chaitanya 2k26 — Firebase Backend & Google Auth Setup Guide

This guide details how to connect your own Firebase project to the **Chaitanya 2k26** website for live Google Authentication and Cloud Firestore registration storage.

---

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"** (or select an existing Google Cloud project).
3. Name your project (e.g., `chaitanya-2k26`).
4. (Optional) Enable Google Analytics and click **"Create project"**.

---

## 2. Register a Web App

1. On your project's overview page, click the **Web icon** (`</>`) to add a web application.
2. Enter an app nickname (e.g., `chaitanya-web`).
3. Click **"Register app"**.
4. Firebase will display your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyBL3ZiGFe3Q7eEnnikto1wnfDxVj0Op3I8",
     authDomain: "chaitainya-hptu.firebaseapp.com",
     projectId: "chaitainya-hptu",
     storageBucket: "chaitainya-hptu.firebasestorage.app",
     messagingSenderId: "453300095500",
     appId: "1:453300095500:web:0933b038d3580842ddbc29",
     measurementId: "G-1JS13R6GY0"
   };
   ```
5. These values are configured in [`noomo-labs-clone/_nuxt/firebase-config.js`](./_nuxt/firebase-config.js).

---

## 3. Enable Google Authentication

1. In the Firebase Console left sidebar, click **"Authentication"** (or **Build > Authentication**).
2. Click **"Get started"**.
3. Under the **"Sign-in method"** tab, select **Google**.
4. Toggle **Enable**.
5. Set your **Project support email** (e.g., `chaitanyahptu@gmail.com`).
6. Click **Save**.
7. Under the **"Settings" > "Authorized domains"** tab:
   - Ensure `localhost` is listed (it is included by default).
   - When deploying to production (e.g., Vercel, Netlify, custom domain), add your production domain here.

---

## 4. Enable Cloud Firestore

1. In the Firebase Console left sidebar, click **"Firestore Database"** (under **Build**).
2. Click **"Create database"**.
3. Choose your database location (e.g., `asia-south1` for Mumbai / India).
4. Start in **Production mode** (or **Test mode** for initial testing).
5. Click **Create**.

### Recommended Security Rules

Go to the **"Rules"** tab in Firestore and paste the following security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profile and registrations
    match /users/{userId} {
      // Anyone can read participant count / profiles if authenticated
      allow read: if request.auth != null;
      
      // Users can write/update only their own record
      allow create, update: if request.auth != null && request.auth.uid == userId;
      
      // Fest admin has full read/write access (chaitanyahptu@gmail.com exclusively)
      allow read, write: if request.auth != null && 
        request.auth.token.email.lower() == "chaitanyahptu@gmail.com";
    }
    
    // Fest Events collection
    match /events/{eventId} {
      allow read: if true; // Publicly viewable
      allow write: if request.auth != null && 
        request.auth.token.email.lower() == "chaitanyahptu@gmail.com";
    }
  }
}
```
Click **Publish**.

---

## 5. Configure Admin Emails

In [`noomo-labs-clone/_nuxt/firebase-config.js`](./_nuxt/firebase-config.js):

```javascript
export const ADMIN_EMAILS = [
  "chaitanyahptu@gmail.com"
];

export function isAdminUser(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === "chaitanyahptu@gmail.com";
}
```

When users log in with `chaitanyahptu@gmail.com`:
1. Their role in the profile is automatically flagged as `[ADMIN]`.
2. Clicking the `[ADMIN]` navbar button grants full access to the **Fest Registrations Management Table** and CSV export.

---

## 6. Development & Testing (Demo Mode)

- If Firebase keys are not yet configured, the frontend automatically runs in **Demo Mode**:
  - One-click Google Sign-in simulation with attendee and admin profiles.
  - Complete testing of Login, Register, Profile, and Admin modals.
  - No errors or blockers.
- Once you paste your real keys into `_nuxt/firebase-config.js`, the app switches directly to live Firebase Authentication and Cloud Firestore syncing!
