
/* =====================================
   NAVIK CHAT — AUTHENTICATION
   File: auth.js
===================================== */

import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// =====================================
// HTML ELEMENTS
// =====================================

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginError =
    document.getElementById("loginError");

// =====================================
// CHECK EXISTING SESSION
// =====================================

onAuthStateChanged(auth, (user) => {

    if (user) {

        window.location.replace("chat.html");

    }

});

// =====================================
// LOGIN FUNCTION
// =====================================

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        // Validation
        if (!email || !password) {

            loginError.textContent =
                "Please enter your email and password.";

            return;

        }

        loginButton.disabled = true;

        loginButton.textContent =
            "Signing in...";

        loginError.textContent = "";

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Authentication listener redirects
            // the user to chat.html.

        } catch (error) {

            console.error("Login failed:", error);

            switch (error.code) {

                case "auth/invalid-credential":

                    loginError.textContent =
                        "Incorrect email or password.";

                    break;

                case "auth/invalid-email":

                    loginError.textContent =
                        "Please enter a valid email address.";

                    break;

                case "auth/too-many-requests":

                    loginError.textContent =
                        "Too many attempts. Try again later.";

                    break;

                case "auth/network-request-failed":

                    loginError.textContent =
                        "Network error. Check your internet connection.";

                    break;

                default:

                    loginError.textContent =
                        "Login failed. Please try again.";

            }

            loginButton.disabled = false;

            loginButton.textContent =
                "Login";

        }

    });

}
