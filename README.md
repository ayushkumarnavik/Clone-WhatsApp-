
# NAVIK PRIVATE CHAT

A private two-participant messaging website with
automatic 8-second message archiving and a protected vault.

## 1. PROJECT FEATURES

- Private two-person messaging
- Firebase Email/Password authentication
- Real-time message delivery
- Automatic message archival after 8 seconds
- Protected message vault
- Temporary vault access sessions
- Archived message search
- Secure Firestore rules
- Server-side message processing
- Responsive dark futuristic interface

## 2. REQUIREMENTS

- Google account
- Firebase project
- Node.js 22
- Firebase CLI
- Google Cloud Tasks API
- Internet connection

## 3. FIREBASE SETUP

1. Open https://console.firebase.google.com/
2. Create a Firebase project.
3. Register a Web App.
4. Copy the Firebase configuration.
5. Paste it into firebase-config.js.
6. Enable Email/Password Authentication.
7. Create two participant accounts.
8. Create Firestore Database.

## 4. AUTHORISED USERS

Copy both Firebase Authentication UIDs.

Replace the UID placeholders in:

- firestore.rules
- functions/index.js

Only those two accounts should be authorised.

## 5. VAULT SECURITY

Set the vault password using Firebase Secret Manager.

Never place the password in:

- HTML files
- CSS files
- JavaScript frontend files
- Public configuration files

Use a strong passphrase instead of a short numeric password.

## 6. CLOUD TASKS SETUP

1. Enable the Cloud Tasks API.
2. Create a queue named message-archive-queue.
3. Configure the task service account.
4. Grant it permission to invoke the private archive function.
5. Configure the Functions service account permissions.
6. Set the archive function URL.
7. Configure the required Firebase parameters.

## 7. INSTALLATION

Open the project terminal.

Install root dependencies:

npm install

Install backend dependencies:

cd functions
npm install
cd ..

Install Firebase CLI if required:

npm install -g firebase-tools

Login:

firebase login

Select your Firebase project:

firebase use YOUR_PROJECT_ID

## 8. DEPLOYMENT

Deploy Firestore rules:

firebase deploy --only firestore:rules

Deploy backend functions:

firebase deploy --only functions

Host the website using Firebase Hosting or another HTTPS static host.

## 9. IMPORTANT

The frontend countdown is only a display feature.

The Cloud Tasks backend is responsible for actual archival.

Test the application with two authorised accounts before
using it for private conversations.

## PROJECT NAME

NAVIK PRIVATE CHAT

Developer: Ayush Kumar Navik
Brand: NAVIK'S TECHPRO
