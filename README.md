# Firebase Image Note Application

## Overview

This application is a Firebase-based note-taking platform designed for private image notes. It allows users to start as anonymous users and later link their accounts to permanent authentication methods (Email/Password, Google Sign-In) to preserve their data. Users can create rich notes with time-ordered entries, including text and images. Notes can be optionally associated with NFC tags or QR codes and can be made public for sharing via a special URL that includes Open Graph Protocol (OGP) tags for social media previews. The system also tracks basic statistics and access logs for notes.

## Features

*   **User Authentication**:
    *   Anonymous user sessions with seamless upgrade/linking.
    *   Registered user accounts via Email/Password and Google Sign-In.
*   **Note Management**:
    *   Create, edit, and delete notes.
    *   Associate notes with tags (comma-separated).
    *   Optional fields for NFC Tag ID and QR Code data.
*   **Note Entries**:
    *   Time-ordered entries within each note.
    *   Entries can contain text and uploaded images (currently one image per entry via client).
    *   Entries can link to other notes (currently via comma-separated Note IDs).
*   **Cloud Functions (Backend Logic)**:
    *   All Cloud Functions are defined within the `note-moukaeritai-work` codebase (see `firebase.json`).
    *   Functions are grouped and exported from `functions/index.js` under a main `note` object (e.g., `exports.note = { logAccess, viewNote, ... }`). This results in deployed function names being prefixed (e.g., `note-logAccess`, `note-viewNote`).
    *   Includes: `logAccess` (callable), `updateNoteStats` (Firestore trigger), `updateStorageStats` (Storage trigger), `syncPublicNote` (Firestore trigger), `viewNote` (HTTP).
*   **Data Management (Client-Side Placeholders)**:
    *   Client-side UI and function calls for initiating data export (`exportUserData`) and import (`importUserData`). Backend Cloud Functions are currently placeholders but are defined for future implementation (e.g. `note-exportUserData`).
*   **Security**:
    *   Firestore security rules to protect user data and manage access to public notes.
    *   Cloud Storage security rules to protect user files and manage access to import/export paths. These rules have been updated to reflect the `note/` top-level directory structure for all application files.
*   **User Experience**:
    *   Basic responsive UI for improved usability on different screen sizes.
    *   Offline support:
        *   App shell (HTML, CSS, JS) caching via a Service Worker.
        *   Firestore data persistence for offline viewing and modification of notes.

## Firebase Project Setup

1.  **Create a Firebase Project**: (As before)
2.  **Enable Services**:
    *   **Authentication**: (As before)
    *   **Firestore (Named Database)**: (As before, mentioning `note-moukaeritai-work`)
    *   **Cloud Storage**: (As before)
    *   **Cloud Functions**:
        *   Ensure "Blaze (pay as you go)" plan.
        *   Node.js runtime (e.g., Node 20) set in `functions/package.json`.
        *   **Codebase & Grouping**: Functions are organized under the `note-moukaeritai-work` codebase in `firebase.json`. Inside `functions/index.js`, they are grouped under an `exports.note` object, leading to deployed names like `note-viewNote`.
3.  **Web App Configuration**: (As before)

## Local Development Setup

1.  **Prerequisites**: (As before)
2.  **Clone Repository** & **Install Dependencies**: (As before)
3.  **Firebase Login** & **Associate Project**: (As before)
    *   Note: `firebase.json` configures multi-target hosting (`note-moukaeritai-work`), a function codebase (`note-moukaeritai-work`), and the client targets the named Firestore DB (`note-moukaeritai-work`).
4.  **(Optional) Running with Emulators**: (As before)
    *   ... Emulators automatically handle functions grouped under a codebase if defined in `firebase.json`.

## Configuration Details

*   **Client-Side Database**: The client connects to the Firestore database `note-moukaeritai-work` (configured in `public/firestore_ops.js`).
*   **Cloud Functions Naming**: Due to the grouping in `functions/index.js` (`exports.note = { ... }`), deployed HTTP and callable functions will have names like `note-viewNote`, `note-logAccess`, etc.
*   **Cloud Functions Database Interaction**: **Important**: Cloud Functions currently use the *default* Firestore database. To target `note-moukaeritai-work`, their `admin.firestore()` initialization needs updating (e.g., `admin.firestore("note-moukaeritai-work")`). This is not yet implemented.
*   **Cloud Storage Path Structure**: All application-specific files in Cloud Storage are stored under a top-level `note/` directory. This applies to:
    *   User images: `note/users/{userId}/{noteId}/{entryId}/{imageFileName}`
    *   Data exports: `note/exports/{userId}/{timestamp}.zip`
    *   Data imports: `note/imports/{userId}/{timestamp}.zip`
    *   The `storage.rules` file has been updated to enforce security based on these prefixed paths.
*   **Hosting Rewrites**: The rewrite rule in `firebase.json` for `/notes/**` correctly targets the `note-viewNote` function (functionId `note-viewNote`) within the `note-moukaeritai-work` codebase.
*   **Client-Side Callable Function Calls**: Client-side calls to these callable functions (e.g., in `public/firestore_ops.js`) have been updated to use the prefixed names (e.g., `httpsCallable(functions, 'note-logAccess')`).

## Deployment

1.  **Deploy to Firebase**:
    *   Project uses multi-target hosting and a specific functions codebase (`note-moukaeritai-work`).
    *   Deploy all services (specific hosting target, function codebase, Firestore rules, Storage rules):
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work,functions:note-moukaeritai-work,firestore,storage
    ```
    *   Deploy only functions in the `note-moukaeritai-work` codebase:
    ```bash
    firebase deploy --only functions:note-moukaeritai-work
    ```
    *   Deploy only the specific hosting target:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work
    ```
    *   Firestore rules deployment: `firebase deploy --only firestore:rules`. (These are generic; client/functions must target the named DB).
    *   Storage rules deployment: `firebase deploy --only storage:rules`.
    *   Ensure `note-moukaeritai-work` database exists.
    *   Select correct project alias (`firebase use <project-alias>`).

## Client Application Usage
(As previously described)

## Notes on Current Implementation
(As previously described, with function database targeting note reiterated)
*   **Cloud Functions Database Target**: As noted in "Configuration Details", Cloud Functions currently use the default Firestore database. This needs to be updated if they are to interact with the `note-moukaeritai-work` database.

This README provides a comprehensive guide to the application in its current state.
