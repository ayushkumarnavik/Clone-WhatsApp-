
/* =====================================
   NAVIK CHAT — SETTINGS
   File: settings.js
===================================== */

import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// HTML elements
const accountEmail = document.getElementById("accountEmail");
const accountStatus = document.getElementById("accountStatus");
const logoutButton = document.getElementById("settingsLogoutButton");

// Check authentication
onAuthStateChanged(auth, (user) => {

    if (user) {

        // Display account email
        if (accountEmail) {
            accountEmail.textContent = user.email || "Email unavailable";
        }

        // Display account status
        if (accountStatus) {
            accountStatus.textContent = "Authenticated";
        }

    } else {

        // Redirect if not logged in
        window.location.replace("index.html");

    }

});

// Secure logout
if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;
        logoutButton.textContent = "Signing out...";

        try {

            await signOut(auth);

            window.location.replace("index.html");

        } catch (error) {

            console.error("Logout error:", error);

            alert("Unable to sign out. Please try again.");

            logoutButton.disabled = false;
            logoutButton.textContent = "Logout";

        }

    });

}
