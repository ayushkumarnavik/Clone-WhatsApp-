
/* =====================================
   NAVIK CHAT — CHAT SYSTEM
   File: chat.js
===================================== */

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// =====================================
// CONFIGURATION
// =====================================

const ROOM_ID = "private-room-7739362847";
const EXPIRY_SECONDS = 8;

const messagesContainer =
    document.getElementById("messagesContainer");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const participantName =
    document.getElementById("participantName");

const connectionStatus =
    document.getElementById("connectionStatus");

const emptyMessage =
    document.getElementById("emptyMessage");

const logoutButton =
    document.getElementById("logoutButton");

let currentUser = null;
let unsubscribeMessages = null;
let countdownInterval = null;

// =====================================
// AUTHENTICATION
// =====================================

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.replace("index.html");
        return;
    }

    currentUser = user;

    if (participantName) {
        participantName.textContent =
            user.email || "Private Participant";
    }

    startChat();

});

// =====================================
// START CHAT
// =====================================

function startChat() {

    if (!currentUser) return;

    const messagesRef = collection(
        db,
        "rooms",
        ROOM_ID,
        "messages"
    );

    const messagesQuery = query(
        messagesRef,
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(
        messagesQuery,

        (snapshot) => {

            messagesContainer.innerHTML = "";

            if (emptyMessage) {
                emptyMessage.style.display =
                    snapshot.empty ? "block" : "none";
            }

            snapshot.forEach((documentSnapshot) => {

                const message = documentSnapshot.data();

                displayMessage(
                    documentSnapshot.id,
                    message
                );

            });

            if (connectionStatus) {
                connectionStatus.textContent = "Connected";
            }

        },

        (error) => {

            console.error("Chat error:", error);

            if (connectionStatus) {
                connectionStatus.textContent =
                    "Connection error";
            }

        }
    );

    startCountdownUpdater();

}

// =====================================
// SEND MESSAGE
// =====================================

if (messageForm) {

    messageForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!currentUser) return;

        const text = messageInput.value.trim();

        if (!text) return;

        if (text.length > 2000) {
            alert("Message cannot exceed 2000 characters.");
            return;
        }

        sendButton.disabled = true;

        try {

            const messagesRef = collection(
                db,
                "rooms",
                ROOM_ID,
                "messages"
            );

            await addDoc(messagesRef, {

                text: text,

                senderId: currentUser.uid,

                senderEmail: currentUser.email,

                createdAt: serverTimestamp(),

                expiresAt: Timestamp.fromMillis(
                    Date.now() + EXPIRY_SECONDS * 1000
                )

            });

            messageInput.value = "";

        } catch (error) {

            console.error("Message sending failed:", error);

            alert("Message could not be sent. Please try again.");

        } finally {

            sendButton.disabled = false;
            messageInput.focus();

        }

    });

}

// =====================================
// DISPLAY MESSAGE
// =====================================

function displayMessage(id, data) {

    const messageElement =
        document.createElement("div");

    const isMine =
        data.senderId === currentUser.uid;

    messageElement.className =
        isMine ? "message mine" : "message theirs";

    messageElement.dataset.messageId = id;

    const body =
        document.createElement("div");

    body.className = "body";

    // Safe text rendering
    body.textContent = data.text || "";

    const meta =
        document.createElement("div");

    meta.className = "meta";

    const sender =
        document.createElement("span");

    sender.textContent =
        isMine ? "You" : "Participant";

    const countdown =
        document.createElement("span");

    countdown.className = "message-countdown";

    countdown.textContent = "8s";

    meta.appendChild(sender);
    meta.appendChild(countdown);

    messageElement.appendChild(body);
    messageElement.appendChild(meta);

    messagesContainer.appendChild(messageElement);

    updateMessageCountdown(messageElement, data);

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

}

// =====================================
// COUNTDOWN DISPLAY
// =====================================

function updateMessageCountdown(element, data) {

    if (!data.expiresAt) return;

    const expiryTime =
        data.expiresAt.toMillis();

    const countdown =
        element.querySelector(".message-countdown");

    if (!countdown) return;

    const remaining = Math.max(
        0,
        Math.ceil((expiryTime - Date.now()) / 1000)
    );

    countdown.textContent =
        remaining + "s";

    if (remaining <= 3) {
        element.classList.add("expiring");
    }

}

// =====================================
// UPDATE ALL COUNTDOWNS
// =====================================

function startCountdownUpdater() {

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {

        const messageElements =
            document.querySelectorAll(".message");

        messageElements.forEach((element) => {

            const countdown =
                element.querySelector(".message-countdown");

            if (!countdown) return;

            const remaining =
                parseInt(countdown.textContent, 10);

            if (Number.isNaN(remaining)) return;

            // Countdown display is refreshed by
            // the expiry timestamp when available.
            const id = element.dataset.messageId;

            if (!id) return;

        });

    }, 1000);

}

// =====================================
// LOGOUT
// =====================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        try {

            if (unsubscribeMessages) {
                unsubscribeMessages();
            }

            if (countdownInterval) {
                clearInterval(countdownInterval);
            }

            await signOut(auth);

            window.location.replace("index.html");

        } catch (error) {

            console.error("Logout failed:", error);

            alert("Unable to logout. Please try again.");

        }

    });

}
