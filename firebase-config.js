
/* =====================================
   NAVIK CHAT — FIREBASE CONFIGURATION
   File: firebase-config.js
===================================== */

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { getAuth } from
"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { getFirestore } from
"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/*
  IMPORTANT:
  Replace the placeholder values below
  with your actual Firebase project details.

  Firebase Console:
  https://console.firebase.google.com/
*/

const firebaseConfig = {

    apiKey: "YOUR_API_KEY",

    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",

    projectId: "YOUR_PROJECT_ID",

    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",

    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",

    appId: "YOUR_APP_ID"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Export Firebase app
export default app;
