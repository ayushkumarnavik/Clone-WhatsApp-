
/* =====================================
   NAVIK CHAT — PRIVATE VAULT
   File: vault.js
===================================== */

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    getFunctions,
    httpsCallable
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

// =====================================
// CONFIGURATION
// =====================================

const ROOM_ID = "private-room-7739362847";

const functions = getFunctions();

const unlockVaultFunction =
    httpsCallable(functions, "unlockVault");

// HTML elements
const unlockForm =
    document.getElementById("vaultUnlockForm");

const passwordInput =
    document.getElementById("vaultPassword");

const unlockButton =
    document.getElementById("unlockButton");

const unlockError =
    document.getElementById("unlockError");

const vaultMessages =
    document.getElementById("vaultMessages");

const vaultEmpty =
    document.getElementById("vaultEmpty");

const vaultSearch =
    document.getElementById("vaultSearch");

const searchButton =
    document.getElementById("searchButton");

const messageCount =
    document.getElementById("messageCount");

let currentUser = null;
let unsubscribeArchive = null;
let archivedMessages = [];

// =====================================
// AUTHENTICATION
// =====================================

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.replace("index.html");
        return;
    }

    currentUser = user;

});

// =====================================
// UNLOCK VAULT
// =====================================

if (unlockForm) {

    unlockForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!currentUser) {
            unlockError.textContent =
                "Please sign in first.";
            return;
        }

        const password = passwordInput.value;

        if (!password) {
            unlockError.textContent =
                "Enter the vault password.";
            return;
        }

        unlockButton.disabled = true;
        unlockButton.textContent = "Verifying...";
        unlockError.textContent = "";

        try {

            await unlockVaultFunction({
                password: password
            });

            passwordInput.value = "";

            window.location.replace("vault.html");

        } catch (error) {

            console.error("Vault unlock failed:", error);

            unlockError.textContent =
                "Incorrect password or access denied.";

            unlockButton.disabled = false;
            unlockButton.textContent = "Unlock Vault";

        }

    });

}

// =====================================
// LOAD ARCHIVED MESSAGES
// =====================================

function loadArchivedMessages() {

    if (!currentUser || !vaultMessages) return;

    const archiveRef = collection(
        db,
        "rooms",
        ROOM_ID,
        "archive"
    );

    const archiveQuery = query(
        archiveRef,
        orderBy("archivedAt", "desc")
    );

    unsubscribeArchive = onSnapshot(
        archiveQuery,

        (snapshot) => {

            archivedMessages = [];

            snapshot.forEach((documentSnapshot) => {

                archivedMessages.push({
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                });

            });

            renderArchivedMessages(archivedMessages);

        },

        (error) => {

            console.error("Archive loading failed:", error);

            vaultMessages.textContent =
                "Unable to access archived messages.";

        }
    );

}

// =====================================
// RENDER ARCHIVED MESSAGES
// =====================================

function renderArchivedMessages(messages) {

    if (!vaultMessages) return;

    vaultMessages.innerHTML = "";

    if (messageCount) {
        messageCount.textContent =
            messages.length + " archived messages";
    }

    if (vaultEmpty) {
        vaultEmpty.style.display =
            messages.length === 0 ? "block" : "none";
    }

    messages.forEach((message) => {

        const card =
            document.createElement("article");

        card.className = "vault-message";

        const header =
            document.createElement("div");

        header.className = "vault-message-header";

        const sender =
            document.createElement("span");

        sender.className = "vault-sender";

        sender.textContent =
            message.senderEmail || "Participant";

        const date =
            document.createElement("span");

        date.className = "vault-date";

        date.textContent =
            formatDate(message.archivedAt);

        const body =
            document.createElement("p");

        body.className = "vault-message-body";

        body.textContent =
            message.text || "";

        const footer =
            document.createElement("div");

        footer.className = "vault-message-footer";

        footer.textContent =
            "Archived message";

        header.appendChild(sender);
        header.appendChild(date);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);

        vaultMessages.appendChild(card);

    });

}

// =====================================
// FORMAT DATE
// =====================================

function formatDate(timestamp) {

    if (!timestamp || !timestamp.toDate) {
        return "Date unavailable";
    }

    return timestamp.toDate().toLocaleString();

}

// =====================================
// SEARCH ARCHIVED MESSAGES
// =====================================

function searchArchivedMessages() {

    const searchText =
        vaultSearch.value.trim().toLowerCase();

    if (!searchText) {
        renderArchivedMessages(archivedMessages);
        return;
    }

    const filteredMessages =
        archivedMessages.filter((message) => {

            const text =
                (message.text || "").toLowerCase();

            const sender =
                (message.senderEmail || "").toLowerCase();

            return (
                text.includes(searchText) ||
                sender.includes(searchText)
            );

        });

    renderArchivedMessages(filteredMessages);

}

if (searchButton) {

    searchButton.addEventListener(
        "click",
        searchArchivedMessages
    );

}

if (vaultSearch) {

    vaultSearch.addEventListener(
        "input",
        searchArchivedMessages
    );

}

// =====================================
// START VAULT ON VAULT PAGE
// =====================================

const isVaultPage =
    window.location.pathname.endsWith("vault.html");

if (isVaultPage) {

    onAuthStateChanged(auth, async (user) => {

        if (!user) return;

        currentUser = user;

        try {

            // The backend must verify that this
            // user has a valid, unexpired vault session.
            await loadArchivedMessages();

        } catch (error) {

            console.error(error);

        }

    });

}

// =====================================
// CLEANUP
// =====================================

window.addEventListener("pagehide", () => {

    if (unsubscribeArchive) {
        unsubscribeArchive();
    }

});
