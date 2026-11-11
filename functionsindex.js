
/* ==========================================
   NAVIK PRIVATE CHAT — BACKEND
   File: functions/index.js
   Runtime: Node.js 22
========================================== */

const { onDocumentCreated } =
    require("firebase-functions/v2/firestore");

const { onRequest, onCall, HttpsError } =
    require("firebase-functions/v2/https");

const { defineSecret, defineString } =
    require("firebase-functions/params");

const admin = require("firebase-admin");

const { CloudTasksClient } =
    require("@google-cloud/tasks");

const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const tasksClient = new CloudTasksClient();

// ==========================================
// CONFIGURATION
// ==========================================

const VAULT_PASSWORD = defineSecret("VAULT_PASSWORD");

const TASKS_LOCATION =
    defineString("TASKS_LOCATION");

const TASKS_QUEUE =
    defineString("TASKS_QUEUE");

const TASKS_SERVICE_ACCOUNT =
    defineString("TASKS_SERVICE_ACCOUNT");

const ARCHIVE_TASK_URL =
    defineString("ARCHIVE_TASK_URL");

const ROOM_ID = "private-room-7739362847";

const EXPIRY_SECONDS = 8;

const VAULT_SESSION_MINUTES = 10;

const MAX_FAILED_ATTEMPTS = 5;

const LOCKOUT_MINUTES = 5;

// ==========================================
// 1. AUTOMATIC MESSAGE ARCHIVING SCHEDULER
// ==========================================

exports.scheduleMessageArchive = onDocumentCreated(
    {
        document: "rooms/{roomId}/messages/{messageId}",
        region: "us-central1"
    },

    async (event) => {

        const { roomId, messageId } = event.params;

        if (roomId !== ROOM_ID) return;

        const messageRef = db
            .collection("rooms")
            .doc(roomId)
            .collection("messages")
            .doc(messageId);

        const messageSnapshot = await messageRef.get();

        if (!messageSnapshot.exists) return;

        const message = messageSnapshot.data();

        // Validate the original message.
        if (
            typeof message.text !== "string" ||
            !message.text.trim() ||
            message.text.length > 2000 ||
            !message.senderId
        ) {
            await messageRef.delete();
            return;
        }

        // Server decides the expiry time.
        const expiresAt = admin.firestore.Timestamp.fromMillis(
            Date.now() + EXPIRY_SECONDS * 1000
        );

        await messageRef.update({
            expiresAt: expiresAt
        });

        // Create Cloud Tasks queue path.
        const parent = tasksClient.queuePath(
            process.env.GCLOUD_PROJECT,
            TASKS_LOCATION.value(),
            TASKS_QUEUE.value()
        );

        const taskPayload = {
            roomId: roomId,
            messageId: messageId
        };

        const task = {
            httpRequest: {
                httpMethod: "POST",

                url: ARCHIVE_TASK_URL.value(),

                headers: {
                    "Content-Type": "application/json"
                },

                body: Buffer
                    .from(JSON.stringify(taskPayload))
                    .toString("base64"),

                oidcToken: {
                    serviceAccountEmail:
                        TASKS_SERVICE_ACCOUNT.value()
                }
            },

            scheduleTime: {
                seconds: Math.floor(
                    expiresAt.toMillis() / 1000
                )
            }
        };

        await tasksClient.createTask({
            parent: parent,
            task: task
        });

    }
);

// ==========================================
// 2. ARCHIVE EXPIRED MESSAGE
// ==========================================

exports.archiveExpiredMessage = onRequest(
    {
        region: "us-central1",
        invoker: "private"
    },

    async (req, res) => {

        if (req.method !== "POST") {
            res.status(405).send("Method not allowed");
            return;
        }

        const { roomId, messageId } = req.body || {};

        if (
            roomId !== ROOM_ID ||
            typeof messageId !== "string"
        ) {
            res.status(400).send("Invalid task data");
            return;
        }

        const messageRef = db
            .collection("rooms")
            .doc(roomId)
            .collection("messages")
            .doc(messageId);

        const archiveRef = db
            .collection("rooms")
            .doc(roomId)
            .collection("archive")
            .doc(messageId);

        try {

            await db.runTransaction(async (transaction) => {

                const messageSnapshot =
                    await transaction.get(messageRef);

                // Task may be retried after success.
                if (!messageSnapshot.exists) return;

                const message = messageSnapshot.data();

                if (!message.expiresAt) {
                    throw new Error("Expiry time missing");
                }

                if (
                    message.expiresAt.toMillis() >
                    Date.now()
                ) {
                    throw new Error("Message has not expired");
                }

                // Copy message to the private archive.
                transaction.set(archiveRef, {

                    text: message.text,

                    senderId: message.senderId,

                    senderEmail: message.senderEmail || "",

                    createdAt: message.createdAt,

                    archivedAt:
                        admin.firestore.FieldValue.serverTimestamp()

                });

                // Remove from ordinary chat.
                transaction.delete(messageRef);

            });

            res.status(200).send("Archive processing complete");

        } catch (error) {

            console.error("Archiving error:", error);

            // Non-retryable invalid tasks should not loop.
            if (
                error.message === "Message has not expired" ||
                error.message === "Expiry time missing"
            ) {
                res.status(200).send("Task ignored");
                return;
            }

            res.status(500).send("Archiving failed");

        }

    }
);

// ==========================================
// 3. VAULT PASSWORD VERIFICATION
// ==========================================

exports.unlockVault = onCall(
    {
        region: "us-central1",
        secrets: [VAULT_PASSWORD]
    },

    async (request) => {

        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "Please sign in first."
            );
        }

        const allowedUIDs = [
            "REPLACE_WITH_FIRST_USER_UID",
            "REPLACE_WITH_SECOND_USER_UID"
        ];

        if (!allowedUIDs.includes(request.auth.uid)) {
            throw new HttpsError(
                "permission-denied",
                "You are not authorised."
            );
        }

        const suppliedPassword = request.data?.password;

        if (
            typeof suppliedPassword !== "string" ||
            suppliedPassword.length > 128
        ) {
            throw new HttpsError(
                "invalid-argument",
                "Invalid password."
            );
        }

        const attemptsRef = db
            .collection("vaultAttempts")
            .doc(request.auth.uid);

        const now = Date.now();

        const attemptSnapshot = await attemptsRef.get();

        const attemptData = attemptSnapshot.exists
            ? attemptSnapshot.data()
            : {};

        const lockedUntil = attemptData.lockedUntil
            ? attemptData.lockedUntil.toMillis()
            : 0;

        if (lockedUntil > now) {
            throw new HttpsError(
                "resource-exhausted",
                "Too many attempts. Try again later."
            );
        }

        const correctPassword =
            VAULT_PASSWORD.value();

        const suppliedBuffer =
            Buffer.from(suppliedPassword);

        const correctBuffer =
            Buffer.from(correctPassword);

        const passwordMatches =
            suppliedBuffer.length === correctBuffer.length &&
            crypto.timingSafeEqual(
                suppliedBuffer,
                correctBuffer
            );

        if (!passwordMatches) {

            await db.runTransaction(async (transaction) => {

                const snapshot =
                    await transaction.get(attemptsRef);

                const current = snapshot.exists
                    ? snapshot.data()
                    : {};

                let attempts =
                    current.attempts || 0;

                attempts++;

                const updates = {
                    attempts: attempts,
                    updatedAt:
                        admin.firestore.FieldValue.serverTimestamp()
                };

                if (attempts >= MAX_FAILED_ATTEMPTS) {

                    updates.attempts = 0;

                    updates.lockedUntil =
                        admin.firestore.Timestamp.fromMillis(
                            Date.now() +
                            LOCKOUT_MINUTES * 60 * 1000
                        );

                }

                transaction.set(
                    attemptsRef,
                    updates,
                    { merge: true }
                );

            });

            throw new HttpsError(
                "permission-denied",
                "Incorrect vault password."
            );

        }

        // Successful login resets failed attempts.
        await attemptsRef.set({
            attempts: 0,
            lockedUntil: null
        });

        // Give this participant temporary vault access.
        const sessionRef = db
            .collection("rooms")
            .doc(ROOM_ID)
            .collection("vaultSessions")
            .doc(request.auth.uid);

        const expiresAt =
            admin.firestore.Timestamp.fromMillis(
                Date.now() +
                VAULT_SESSION_MINUTES * 60 * 1000
            );

        await sessionRef.set({
            expiresAt: expiresAt,
            createdAt:
                admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: "Vault unlocked.",
            expiresAt: expiresAt.toMillis()
        };

    }
);
